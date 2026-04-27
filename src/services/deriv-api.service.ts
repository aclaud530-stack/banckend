import axios from 'axios';
import WebSocket from 'ws';
import logger from '@utils/logger.js';
import { config } from '@config/index.js';

const DERIV_REST_BASE = 'https://api.derivws.com';

interface DerivAccount {
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
    url: string; // wss://api.derivws.com/trading/v1/options/ws/demo?otp=...
  };
}

interface AccountsResponse {
  data: DerivAccount[];
}

/**
 * Faz chamadas REST autenticadas à API Deriv.
 * O header Deriv-App-ID é obrigatório em todas as chamadas REST.
 */
function derivRestHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Deriv-App-ID': config.deriv.appId,
    'Content-Type': 'application/json',
  };
}

/**
 * Obtém todas as contas Options do utilizador.
 * GET /trading/v1/options/accounts
 */
export async function getAccounts(accessToken: string): Promise<DerivAccount[]> {
  try {
    const response = await axios.get<AccountsResponse>(
      `${DERIV_REST_BASE}/trading/v1/options/accounts`,
      { headers: derivRestHeaders(accessToken) }
    );
    logger.info('Accounts fetched', { count: response.data.data.length });
    return response.data.data;
  } catch (error) {
    logger.error('Failed to fetch accounts', { error });
    throw error;
  }
}

/**
 * Obtém o OTP (One-Time Password) para autenticar o WebSocket.
 * POST /trading/v1/options/accounts/{accountId}/otp
 * Retorna um URL WebSocket pronto para usar.
 */
export async function getOTP(accessToken: string, accountId: string): Promise<string> {
  try {
    const response = await axios.post<OTPResponse>(
      `${DERIV_REST_BASE}/trading/v1/options/accounts/${accountId}/otp`,
      {},
      { headers: derivRestHeaders(accessToken) }
    );
    const wsUrl = response.data.data.url;
    logger.info('OTP obtained', { accountId, wsUrl });
    return wsUrl;
  } catch (error) {
    logger.error('Failed to obtain OTP', { accountId, error });
    throw error;
  }
}

/**
 * Cria uma ligação WebSocket autenticada usando o URL do OTP.
 * O fluxo correto segundo a documentação Deriv:
 *   1. POST /accounts/{accountId}/otp → recebe wsUrl
 *   2. new WebSocket(wsUrl) → já autenticado, sem authorize step
 */
export function createAuthenticatedWebSocket(
  wsUrl: string,
  onMessage: (data: any) => void,
  onError?: (error: Error) => void,
  onClose?: () => void
): WebSocket {
  const ws = new WebSocket(wsUrl);

  ws.on('open', () => {
    logger.info('WebSocket connected (authenticated via OTP)');

    // Ping periódico para manter a ligação viva (recomendado: 30s)
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ ping: 1 }));
      } else {
        clearInterval(pingInterval);
      }
    }, 30_000);

    ws.on('close', () => clearInterval(pingInterval));
  });

  ws.on('message', (raw: WebSocket.Data) => {
    try {
      const data = JSON.parse(raw.toString());
      if (data.msg_type === 'ping') return; // ignora pings internos
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
    logger.info('WebSocket closed');
    onClose?.();
  });

  return ws;
}

/**
 * Cria uma ligação WebSocket pública (sem autenticação).
 * Útil para dados de mercado públicos: ticks, active_symbols, etc.
 */
export function createPublicWebSocket(
  onMessage: (data: any) => void,
  onError?: (error: Error) => void
): WebSocket {
  const ws = new WebSocket('wss://api.derivws.com/trading/v1/options/ws/public');

  ws.on('open', () => {
    logger.info('Public WebSocket connected');
  });

  ws.on('message', (raw: WebSocket.Data) => {
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

/**
 * Health check usando o endpoint REST da Deriv.
 */
export async function healthCheck(): Promise<{ status: string }> {
  try {
    const response = await axios.get(`${DERIV_REST_BASE}/v1/health`);
    return response.data;
  } catch {
    return { status: 'error' };
  }
}
