import axios from 'axios';
import WebSocket from 'ws';
import logger from '@utils/logger.js';
import { config } from '@config/index.js';

const DERIV_REST_BASE = 'https://api.derivws.com';

export interface DerivAccount {
  account_id: string;
  balance: number;
  currency: string;
  account_type: 'demo' | 'real';
  status: string;
  group: string;
  email?: string;
  name?: string;
}

interface OTPResponse {
  data: {
    url: string;
  };
}

interface AccountsResponse {
  data: DerivAccount[];
}

/**
 * Serviço principal de integração com a Deriv API.
 *
 * Fluxo autenticado (REST + WebSocket):
 *   1. GET  /trading/v1/options/accounts              → listar contas
 *   2. POST /trading/v1/options/accounts/{id}/otp     → obter URL WebSocket
 *   3. new WebSocket(otpUrl)                          → já autenticado via OTP
 *
 * Fluxo público (WebSocket sem auth):
 *   new WebSocket('wss://api.derivws.com/trading/v1/options/ws/public')
 */
export class DerivAPIService {
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
  }

  // ── Headers obrigatórios em todas as chamadas REST ────────────────────────

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Deriv-App-ID': config.deriv.appId,
      'Content-Type': 'application/json',
    };
  }

  // ── REST: Contas ──────────────────────────────────────────────────────────

  /**
   * GET /trading/v1/options/accounts
   * Retorna todas as contas Options do utilizador.
   */
  async getAccounts(): Promise<AccountsResponse> {
    try {
      const response = await axios.get<AccountsResponse>(
        `${DERIV_REST_BASE}/trading/v1/options/accounts`,
        { headers: this.headers }
      );
      logger.info('Accounts fetched', { count: response.data.data.length });
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch accounts', { error });
      throw error;
    }
  }

  /**
   * POST /trading/v1/options/accounts/{accountId}/otp
   * Gera um OTP e retorna o URL WebSocket autenticado.
   */
  async getOTP(accountId: string): Promise<{ url: string; wsUrl: string }> {
    try {
      const response = await axios.post<OTPResponse>(
        `${DERIV_REST_BASE}/trading/v1/options/accounts/${accountId}/otp`,
        {},
        { headers: this.headers }
      );
      const url = response.data.data.url;
      logger.info('OTP obtained', { accountId });
      return { url, wsUrl: url };
    } catch (error) {
      logger.error('Failed to obtain OTP', { accountId, error });
      throw error;
    }
  }

  // ── REST: Health Check ────────────────────────────────────────────────────

  /**
   * GET /v1/health
   * Verifica a disponibilidade do serviço Deriv.
   */
  async healthCheck(): Promise<{ status: string }> {
    try {
      const response = await axios.get<{ status: string }>(
        `${DERIV_REST_BASE}/v1/health`,
        { headers: this.headers }
      );
      return response.data;
    } catch {
      return { status: 'error' };
    }
  }

  // ── WebSocket autenticado (via OTP) ───────────────────────────────────────

  /**
   * Cria uma ligação WebSocket autenticada usando o URL retornado pelo OTP.
   * Não requer passo de autorização — a autenticação é feita via OTP no URL.
   */
  createAuthenticatedWebSocket(
    wsUrl: string,
    onMessage: (data: any) => void,
    onError?: (error: Error) => void,
    onClose?: () => void
  ): WebSocket {
    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      logger.info('Authenticated WebSocket connected');

      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ ping: 1 }));
        } else {
          clearInterval(pingInterval);
        }
      }, 30_000);

      ws.on('close', () => clearInterval(pingInterval));
    });

    ws.on('message', (raw: WebSocket.RawData) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.msg_type === 'ping') return;
        onMessage(data);
      } catch {
        logger.warn('WebSocket message parse error');
      }
    });

    ws.on('error', (err: Error) => {
      logger.error('WebSocket error', { message: err.message });
      onError?.(err);
    });

    ws.on('close', () => {
      logger.info('Authenticated WebSocket closed');
      onClose?.();
    });

    return ws;
  }

  // ── WebSocket público (sem autenticação) ──────────────────────────────────

  /**
   * Cria uma ligação WebSocket pública.
   * Útil para dados de mercado: ticks, active_symbols, contracts_for, etc.
   */
  createPublicWebSocket(
    onMessage: (data: any) => void,
    onError?: (error: Error) => void
  ): WebSocket {
    const ws = new WebSocket('wss://api.derivws.com/trading/v1/options/ws/public');

    ws.on('open', () => {
      logger.info('Public WebSocket connected');
    });

    ws.on('message', (raw: WebSocket.RawData) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.msg_type === 'ping') return;
        onMessage(data);
      } catch {
        logger.warn('Public WebSocket message parse error');
      }
    });

    ws.on('error', (err: Error) => {
      logger.error('Public WebSocket error', { message: err.message });
      onError?.(err);
    });

    return ws;
  }
}
