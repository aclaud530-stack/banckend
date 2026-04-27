import { Router, Request, Response, NextFunction } from 'express';
import { DerivAPIService } from '@services/deriv-api.service.js';
import { AuthService } from '@services/auth.service.js';
import logger from '@utils/logger.js';

const router: Router = Router();

/**
 * GET /api/accounts
 * Retorna as contas do utilizador autenticado.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = AuthService.extractBearerToken(req.headers.authorization);
    const derivAPI = new DerivAPIService(token);
    const result = await derivAPI.getAccounts();
    res.json({ success: true, data: result.data });
  } catch (error) {
    logger.error('Failed to get accounts', { error });
    next(error);
  }
});

/**
 * POST /api/accounts/:accountId/otp
 * Gera um OTP e retorna o URL WebSocket autenticado.
 */
router.post('/:accountId/otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = AuthService.extractBearerToken(req.headers.authorization);
    const { accountId } = req.params;
    const derivAPI = new DerivAPIService(token);
    const otpData = await derivAPI.getOTP(accountId);
    logger.info('OTP generated', { accountId });
    res.json({ success: true, data: { wsUrl: otpData.url } });
  } catch (error) {
    logger.error('Failed to generate OTP', { error });
    next(error);
  }
});

export default router;
