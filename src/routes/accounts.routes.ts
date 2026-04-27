import { Router, Request, Response, NextFunction } from 'express';
import { getAccounts, getOTP } from '@services/deriv-api.service.js';
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
    const accounts = await getAccounts(token);
    res.json({ success: true, data: accounts });
  } catch (error) {
    logger.error('Failed to get accounts', { error });
    next(error);
  }
});

/**
 * POST /api/accounts/:accountId/otp
 * Gera um OTP e retorna o URL WebSocket autenticado.
 * O frontend usa este URL para conectar ao WebSocket da Deriv diretamente.
 */
router.post('/:accountId/otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = AuthService.extractBearerToken(req.headers.authorization);
    const { accountId } = req.params;

    const wsUrl = await getOTP(token, accountId);

    logger.info('OTP generated for account', { accountId });
    res.json({ success: true, data: { wsUrl } });
  } catch (error) {
    logger.error('Failed to generate OTP', { error });
    next(error);
  }
});

export default router;
