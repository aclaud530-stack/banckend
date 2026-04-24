import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { config } from '@config/index.js';
import logger from '@utils/logger.js';

interface WebSocketSubscription {
  id: string;
  type: string;
  handler: (data: any) => void;
  expiresAt?: number;
}

export interface WebSocketOptions {
  url: string;
  autoConnect?: boolean;
  heartbeatInterval?: number;
  reconnectMaxAttempts?: number;
  reconnectDelay?: number;
}

export class WebSocketManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private subscriptions = new Map<string, WebSocketSubscription>();
  private pendingRequests = new Map<string, { resolve: Function; reject: Function }>();
  private messageQueue: any[] = [];
  private isConnected = false;
  private reconnectAttempts = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private readonly options: Required<WebSocketOptions>;

  constructor(options: WebSocketOptions) {
    super();
    this.url = options.url;
    this.options = {
      autoConnect: options.autoConnect ?? true,
      heartbeatInterval: options.heartbeatInterval ?? config.websocket.heartbeatInterval,
      reconnectMaxAttempts: options.reconnectMaxAttempts ?? config.websocket.reconnectMaxAttempts,
      reconnectDelay: options.reconnectDelay ?? config.websocket.reconnectDelay,
      url: options.url,
    };

    if (this.options.autoConnect) {
      this.connect();
    }
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        logger.info('Connecting to WebSocket', { url: this.url });

        this.ws = new WebSocket(this.url);

        this.connectionTimeout = setTimeout(() => {
          if (!this.isConnected) {
            this.ws?.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(this.connectionTimeout!);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          logger.info('WebSocket connected');
          this.startHeartbeat();
          this.flushMessageQueue();
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          // Converte qualquer tipo de data para string
          const raw = typeof event.data === 'string'
            ? event.data
            : event.data instanceof Buffer
              ? event.data.toString()
              : Buffer.from(event.data as ArrayBuffer).toString();
          this.handleMessage(raw);
        };

        this.ws.onerror = (event) => {
          logger.error('WebSocket error', { message: (event as any).message });
          this.emit('error', event);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.stopHeartbeat();
          logger.warn('WebSocket disconnected');
          this.emit('disconnected');
          this.attemptReconnect();
        };
      } catch (error) {
        logger.error('Failed to create WebSocket', { error });
        reject(error);
      }
    });
  }

  private handleMessage(data: string) {
    try {
      const message = JSON.parse(data);

      if (message.msg_type === 'ping') {
        this.send({ pong: 1 });
        return;
      }

      if (message.req_id) {
        const pending = this.pendingRequests.get(String(message.req_id));
        if (pending) {
          pending.resolve(message);
          this.pendingRequests.delete(String(message.req_id));
          return;
        }
      }

      if (message.subscription?.id) {
        const subscription = this.subscriptions.get(message.subscription.id);
        if (subscription) {
          subscription.handler(message);
        }
      }

      this.emit('message', message);
    } catch (error) {
      logger.error('Failed to parse WebSocket message', { error, data });
    }
  }

  send(payload: any, timeout = 30000): Promise<any> {
    return new Promise((resolve, reject) => {
      const message = {
        ...payload,
        req_id: payload.req_id || uuidv4(),
      };

      if (!this.isConnected) {
        this.messageQueue.push(message);
        logger.warn('WebSocket not connected, message queued', { reqId: message.req_id });
        return;
      }

      try {
        this.ws?.send(JSON.stringify(message));

        if (payload.req_id) {
          const timeoutId = setTimeout(() => {
            this.pendingRequests.delete(String(message.req_id));
            reject(new Error(`Request ${message.req_id} timed out`));
          }, timeout);

          this.pendingRequests.set(String(message.req_id), {
            resolve: (data: any) => {
              clearTimeout(timeoutId);
              resolve(data);
            },
            reject,
          });
        } else {
          resolve(null);
        }
      } catch (error) {
        logger.error('Failed to send WebSocket message', { error });
        reject(error);
      }
    });
  }

  subscribe(
    type: string,
    payload: any,
    handler: (data: any) => void
  ): string {
    const subscriptionId = uuidv4();

    const subscription: WebSocketSubscription = {
      id: subscriptionId,
      type,
      handler,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };

    this.subscriptions.set(subscriptionId, subscription);

    this.send({
      ...payload,
      subscribe: 1,
    }).catch((error: any) => {
      logger.error('Subscription failed', { error, type });
      this.subscriptions.delete(subscriptionId);
    });

    logger.info('WebSocket subscription created', { subscriptionId, type });
    return subscriptionId;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      logger.warn('Subscription not found', { subscriptionId });
      return;
    }

    try {
      await this.send({ forget: subscriptionId });
      this.subscriptions.delete(subscriptionId);
      logger.info('WebSocket subscription removed', { subscriptionId });
    } catch (error) {
      logger.error('Failed to unsubscribe', { error, subscriptionId });
      throw error;
    }
  }

  async unsubscribeAll(type?: string): Promise<void> {
    try {
      // Corrigido: Array.from() resolve o erro de MapIterator sem .map()
      const allSubs = Array.from(this.subscriptions.values());
      const types = type
        ? [type]
        : Array.from(new Set(allSubs.map((s: WebSocketSubscription) => s.type)));

      await this.send({ forget_all: types });
      this.subscriptions.clear();
      logger.info('All WebSocket subscriptions removed', { types });
    } catch (error) {
      logger.error('Failed to unsubscribe all', { error });
      throw error;
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ ping: 1 }).catch((error: any) => {
          logger.warn('Heartbeat failed', { error });
        });

        this.heartbeatTimeout = setTimeout(() => {
          logger.warn('Heartbeat timeout, reconnecting...');
          this.reconnect();
        }, 5000);
      }
    }, this.options.heartbeatInterval);

    logger.debug('Heartbeat started', { interval: this.options.heartbeatInterval });
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.options.reconnectMaxAttempts) {
      logger.error('Max reconnection attempts reached', {
        attempts: this.reconnectAttempts,
      });
      this.emit('reconnect_failed');
      return;
    }

    const delay = this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    logger.info('Attempting to reconnect', {
      attempt: this.reconnectAttempts,
      delay: `${delay}ms`,
    });

    setTimeout(() => {
      this.connect().catch((error: any) => {
        logger.error('Reconnection failed', { error });
      });
    }, delay);
  }

  reconnect() {
    if (this.ws) {
      this.ws.close();
    }
    this.reconnectAttempts = 0;
    this.connect();
  }

  private flushMessageQueue() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      try {
        this.ws?.send(JSON.stringify(message));
        logger.debug('Queued message sent', { reqId: message.req_id });
      } catch (error) {
        logger.error('Failed to send queued message', { error });
        this.messageQueue.unshift(message);
        break;
      }
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.stopHeartbeat();
    this.isConnected = false;
    logger.info('WebSocket disconnected');
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      subscriptions: this.subscriptions.size,
      pendingRequests: this.pendingRequests.size,
      messageQueue: this.messageQueue.length,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  cleanupExpired() {
    const now = Date.now();
    const expired = Array.from(this.subscriptions.entries())
      .filter(([_, sub]) => sub.expiresAt && sub.expiresAt < now)
      .map(([id]) => id);

    expired.forEach(id => this.subscriptions.delete(id));

    if (expired.length > 0) {
      logger.info('Expired subscriptions cleaned up', { count: expired.length });
    }
  }
}
