import axios, { AxiosInstance } from 'axios';
import { config } from '@config/index.js';
import logger from '@utils/logger.js';
import { DerivAPIError } from '../types/errors.js';

export class DerivAPIService {
  private apiClient: AxiosInstance;
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    this.apiClient = axios.create({
      baseURL: config.deriv.apiBaseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Deriv-App-ID': config.deriv.appId,
      },
    });
    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (axios.isAxiosError(error)) {
          const message = error.response?.data?.error?.message || error.message;
          const code = error.response?.data?.error?.code || 'UNKNOWN_ERROR';
          const statusCode = error.response?.status || 500;
          logger.error('Deriv API error', { message, code, statusCode, url: error.config?.url });
          throw new DerivAPIError(message, statusCode, code);
        }
        throw error;
      }
    );
  }

  async getAccounts() {
    try {
      const response = await this.apiClient.get('/trading/v1/options/accounts');
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch accounts', { error });
      throw error;
    }
  }

  async createAccount(options: {
    currency: 'USD';
    group: 'row';
    accountType: 'demo' | 'real';
  }) {
    try {
      const response = await this.apiClient.post('/trading/v1/options/accounts', {
        currency: options.currency,
        group: options.group,
        account_type: options.accountType,
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to create account', { error });
      throw error;
    }
  }

  async resetDemoBalance(accountId: string) {
    try {
      const response = await this.apiClient.post(
        `/trading/v1/options/accounts/${accountId}/reset-demo-balance`
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to reset demo balance', { error });
      throw error;
    }
  }

  async getOTP(accountId: string) {
    try {
      const response = await this.apiClient.post(
        `/trading/v1/options/accounts/${accountId}/otp`
      );
      logger.info('OTP generated', { accountId });
      return response.data.data;
    } catch (error) {
      logger.error('Failed to get OTP', { error, accountId });
      throw error;
    }
  }

  async healthCheck() {
    try {
      const response = await this.apiClient.get('/v1/health');
      return response.data;
    } catch (error) {
      logger.error('Health check failed', { error });
      throw error;
    }
  }

  updateAccessToken(newToken: string) {
    this.accessToken = newToken;
    this.apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    logger.info('Access token updated');
  }
}
