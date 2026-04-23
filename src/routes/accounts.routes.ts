import { Router, Request, Response, NextFunction } from 'express';
import { DerivAPIService } from '@services/deriv-api.service.js';
import { AuthService } from '@services/auth.service.js';
import { AccountCreationSchema } from '@types/schemas.js';
import { apiLimiter } from '@middleware/security.js';
import logger from '@utils/logger.js';

const router = Router();

/**
 * Middleware to extract and validate bearer token
 */
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthService.extractBearerToken(authHeader);
    (req as any).token = token;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Valid authorization token required',
    });
  }
};

router.use(requireAuth);
router.use(apiLimiter);

/**
 * GET /api/accounts
 * Get all trading accounts for the authenticated user
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = (req as any).token;
    const derivAPI = new DerivAPIService(token);

    const accountsData = await derivAPI.getAccounts();

    logger.info('Accounts retrieved', { count: accountsData.data?.length });

    res.json({
      success: true,
      data: {
        accounts: accountsData.data || [],
        meta: accountsData.meta,
      },
    });
  } catch (error) {
    logger.error('Failed to retrieve accounts', { error });
    next(error);
  }
});

/**
 * POST /api/accounts
 * Create a new trading account
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = (req as any).token;

    // Validate request body
    const validated = AccountCreationSchema.parse(req.body);

    const derivAPI = new DerivAPIService(token);
    const accountData = await derivAPI.createAccount({
      currency: validated.currency,
      group: validated.group,
      accountType: validated.accountType,
    });

    logger.info('Account created', {
      accountType: validated.accountType,
      accountId: accountData.data?.[0]?.account_id,
    });

    res.status(201).json({
      success: true,
      data: {
        account: accountData.data?.[0],
        meta: accountData.meta,
      },
    });
  } catch (error) {
    logger.error('Failed to create account', { error });
    next(error);
  }
});

/**
 * POST /api/accounts/:accountId/reset-demo-balance
 * Reset demo account balance
 */
router.post('/:accountId/reset-demo-balance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = (req as any).token;
    const accountId = req.params.accountId;

    const derivAPI = new DerivAPIService(token);
    const result = await derivAPI.resetDemoBalance(accountId);

    logger.info('Demo balance reset', { accountId });

    res.json({
      success: true,
      data: {
        account: result.data,
        meta: result.meta,
      },
    });
  } catch (error) {
    logger.error('Failed to reset demo balance', { error, accountId: req.params.accountId });
    next(error);
  }
});

/**
 * POST /api/accounts/:accountId/otp
 * Get OTP for WebSocket authentication
 */
router.post('/:accountId/otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = (req as any).token;
    const accountId = req.params.accountId;

    const derivAPI = new DerivAPIService(token);
    const otpData = await derivAPI.getOTP(accountId);

    logger.info('OTP generated for WebSocket', { accountId });

    res.json({
      success: true,
      data: {
        wsUrl: otpData.url,
        accountId,
      },
    });
  } catch (error) {
    logger.error('Failed to generate OTP', { error, accountId: req.params.accountId });
    next(error);
  }
});

/**
 * GET /api/accounts/:accountId
 * Get specific account details
 */
router.get('/:accountId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = (req as any).token;
    const accountId = req.params.accountId;

    const derivAPI = new DerivAPIService(token);
    const accountsData = await derivAPI.getAccounts();

    const account = accountsData.data?.find((acc: any) => acc.account_id === accountId);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    logger.info('Account details retrieved', { accountId });

    res.json({
      success: true,
      data: {
        account,
        meta: accountsData.meta,
      },
    });
  } catch (error) {
    logger.error('Failed to retrieve account details', { error, accountId: req.params.accountId });
    next(error);
  }
});

export default router;
