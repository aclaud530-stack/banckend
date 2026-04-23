import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import axios from 'axios';
import { config } from '@config/index.js';
import logger from '@utils/logger.js';
import { AuthenticationError } from '@types/errors.js';

interface PKCEPair {
  codeVerifier: string;
  codeChallenge: string;
}

interface TokenResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

interface UserSession {
  accessToken: string;
  expiresAt: number;
  refreshToken?: string;
  userId: string;
}

export class AuthService {
  /**
   * Generate PKCE code verifier and challenge
   */
  static generatePKCE(): PKCEPair {
    const codeVerifier = Array.from(crypto.getRandomValues(new Uint8Array(64)))
      .map((v) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'[v % 66])
      .join('');

    const hash = crypto.createHash('sha256').update(codeVerifier).digest();
    const codeChallenge = Buffer.from(hash)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return { codeVerifier, codeChallenge };
  }

  /**
   * Generate random state for CSRF protection
   */
  static generateState(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Build authorization URL for login
   */
  static buildAuthorizationUrl(options: {
    prompt?: 'login' | 'registration';
    sidc?: string;
    utmCampaign?: string;
    utmMedium?: string;
    utmSource?: string;
  } = {}): string {
    const pkce = this.generatePKCE();
    const state = this.generateState();

    // Store in-memory (in production, use Redis or session store)
    const sessionKey = `pkce_${state}`;
    global.authSessions = global.authSessions || {};
    global.authSessions[sessionKey] = {
      codeVerifier: pkce.codeVerifier,
      state,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    };

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.deriv.clientId,
      redirect_uri: config.deriv.redirectUri,
      scope: 'trade',
      state,
      code_challenge: pkce.codeChallenge,
      code_challenge_method: 'S256',
      ...(options.prompt && { prompt: options.prompt }),
      ...(options.sidc && { sidc: options.sidc }),
      ...(options.utmCampaign && { utm_campaign: options.utmCampaign }),
      ...(options.utmMedium && { utm_medium: options.utmMedium }),
      ...(options.utmSource && { utm_source: options.utmSource }),
    });

    return `${config.deriv.authBaseUrl}/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(code: string, state: string): Promise<TokenResponse> {
    try {
      // Verify state and retrieve stored PKCE
      const sessionKey = `pkce_${state}`;
      global.authSessions = global.authSessions || {};
      const session = global.authSessions[sessionKey];

      if (!session) {
        throw new AuthenticationError('Invalid or expired state');
      }

      if (Date.now() > session.expiresAt) {
        delete global.authSessions[sessionKey];
        throw new AuthenticationError('Authorization request expired');
      }

      const { codeVerifier } = session;

      const tokenResponse = await axios.post(
        `${config.deriv.authBaseUrl}/token`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: config.deriv.clientId,
          code,
          code_verifier: codeVerifier,
          redirect_uri: config.deriv.redirectUri,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      // Clean up session
      delete global.authSessions[sessionKey];

      const { access_token, expires_in, token_type } = tokenResponse.data;

      logger.info('Token exchange successful', { expiresIn: expires_in });

      return {
        accessToken: access_token,
        expiresIn: expires_in,
        tokenType: token_type,
      };
    } catch (error) {
      logger.error('Token exchange failed', {
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      if (axios.isAxiosError(error)) {
        const deriveError = error.response?.data?.error;
        throw new AuthenticationError(
          deriveError?.message || 'Failed to exchange authorization code for token'
        );
      }

      throw error;
    }
  }

  /**
   * Create user session
   */
  static createSession(accessToken: string, expiresIn: number): UserSession {
    const userId = uuidv4();
    const expiresAt = Date.now() + expiresIn * 1000;

    logger.info('User session created', { userId, expiresAt });

    return {
      accessToken,
      expiresAt,
      userId,
    };
  }

  /**
   * Verify token expiration
   */
  static isTokenExpired(session: UserSession): boolean {
    return Date.now() > session.expiresAt;
  }

  /**
   * Validate bearer token format
   */
  static extractBearerToken(authHeader?: string): string {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header');
    }
    return authHeader.slice(7);
  }
}

// Global type augmentation for session storage
declare global {
  var authSessions: Record<string, {
    codeVerifier: string;
    state: string;
    expiresAt: number;
  }>;
}
