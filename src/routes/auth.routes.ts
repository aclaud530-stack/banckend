import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '@services/auth.service.js';
import { DerivAPIService } from '@services/deriv-api.service.js';
import { authLimiter } from '@middleware/security.js';
import logger from '@utils/logger.js';

const router: Router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://teu-frontend.vercel.app';

/**
 * GET /api/auth/login
 */
router.get('/login', authLimiter, (req: Request, res: Response, next: NextFunction) => {
  try {
    const prompt = (req.query.prompt as 'login' | 'registration') || 'login';
    const sidc = req.query.sidc as string | undefined;
    const utmCampaign = req.query.utm_campaign as string | undefined;
    const utmMedium = req.query.utm_medium as string | undefined;
    const utmSource = req.query.utm_source as string | undefined;

    const authUrl = AuthService.buildAuthorizationUrl({
      prompt,
      sidc,
      utmCampaign,
      utmMedium,
      utmSource,
    });

    logger.info('Login initiated', { prompt });
    res.json({ authUrl });
  } catch (error) {
    logger.error('Login failed', { error });
    next(error);
  }
});

/**
 * GET /api/auth/callback
 */
router.get('/callback', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    const error = req.query.error as string | undefined;

    if (error) {
      logger.warn('OAuth callback error', { error });
      return res.redirect(`${FRONTEND_URL}/?error=${error}`);
    }

    if (!code || !state) {
      logger.warn('Missing authorization code or state');
      return res.redirect(`${FRONTEND_URL}/?error=missing_params`);
    }

    const token = await AuthService.exchangeCodeForToken(code, state);
    const session = AuthService.createSession(token.accessToken, token.expiresIn);

    logger.info('User authenticated successfully', { userId: session.userId });

    // Redireciona para o frontend com o token
    return res.redirect(`${FRONTEND_URL}/dashboard?token=${session.accessToken}`);

  } catch (error) {
    logger.error('Callback handling failed', { error });
    return res.redirect(`${FRONTEND_URL}/?error=auth_failed`);
  }
});

/**
 * GET /api/auth/signup
 */
router.get('/signup', authLimiter, (req: Request, res: Response, next: NextFunction) => {
  try {
    const sidc = req.query.sidc as string | undefined;
    const utmCampaign = req.query.utm_campaign as string | undefined;
    const utmMedium = req.query.utm_medium as string | undefined;
    const utmSource = req.query.utm_source as string | undefined;

    const signupUrl = AuthService.buildAuthorizationUrl({
      prompt: 'registration',
      sidc,
      utmCampaign,
      utmMedium,
      utmSource,
    });

    logger.info('Signup initiated');
    res.json({ signupUrl });
  } catch (error) {
    logger.error('Signup failed', { error });
    next(error);
  }
});

/**
 * POST /api/auth/refresh-token
 */
router.post('/refresh-token', authLimiter, (_req: Request, res: Response) => {
  res.status(501).json({
    error: 'Token refresh not yet implemented',
    message: 'Please re-authenticate using the login endpoint',
  });
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('User logged out');
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout failed', { error });
    next(error);
  }
});

/**
 * GET /api/auth/validate
 */
router.get('/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthService.extractBearerToken(authHeader);

    const derivAPI = new DerivAPIService(token);
    const health = await derivAPI.healthCheck();

    res.json({
      success: true,
      valid: health.status === 'ok',
    });
  } catch (error) {
    logger.error('Token validation failed', { error });
    next(error);
  }
});

export default router;
