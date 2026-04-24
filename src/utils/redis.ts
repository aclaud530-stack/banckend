import { createClient } from 'redis';
import { config } from '@config/index.js';
import logger from '@utils/logger.js';
import { getMemoryStore } from '@utils/memory-store.js';

let redisClient: any = null;
let isRedisAvailable = false;

export const initRedis = async () => {
  try {
    redisClient = createClient({
      url: config.redis.url,
      socket: {
        reconnectStrategy: (retries: number) => Math.min(retries * 50, 500),
      },
    });

    redisClient.on('error', (err: any) => {
      logger.warn('Redis connection lost, using in-memory store', { error: err.message });
      isRedisAvailable = false;
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
      isRedisAvailable = true;
    });

    await redisClient.connect();
    isRedisAvailable = true;
  } catch (error) {
    logger.warn('Redis not available, using in-memory store', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    isRedisAvailable = false;
  }
};

export const redisGet = async (key: string): Promise<string | null> => {
  if (isRedisAvailable && redisClient) {
    try {
      return await redisClient.get(key);
    } catch (error) {
      logger.error('Redis get error, falling back to memory', { error });
    }
  }
  const memStore = getMemoryStore();
  return memStore.get(key);
};

export const redisSet = async (
  key: string,
  value: string,
  ttl?: number
): Promise<void> => {
  if (isRedisAvailable && redisClient) {
    try {
      if (ttl) {
        await redisClient.setEx(key, ttl, value);
      } else {
        await redisClient.set(key, value);
      }
      return;
    } catch (error) {
      logger.error('Redis set error, falling back to memory', { error });
    }
  }
  const memStore = getMemoryStore();
  memStore.set(key, value, ttl);
};

export const redisDel = async (key: string): Promise<void> => {
  if (isRedisAvailable && redisClient) {
    try {
      await redisClient.del(key);
      return;
    } catch (error) {
      logger.error('Redis del error, falling back to memory', { error });
    }
  }
  const memStore = getMemoryStore();
  memStore.delete(key);
};

export const isRedisConnected = (): boolean => isRedisAvailable;

export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis', { error });
    }
  }
};
