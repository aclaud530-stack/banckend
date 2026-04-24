import { Router, Request, Response, NextFunction } from 'express';
import { TradingService } from '@services/trading.service.js';
import { DerivAPIService } from '@services/deriv-api.service.js';
import { AuthService } from '@services/auth.service.js';
import {
  ProposalRequestSchema,
  BuyRequestSchema,
  SellRequestSchema,
  OTPRequestSchema,
} from '../types/schemas.js';
import { apiLimiter } from '@middleware/security.js';
import logger from '@utils/logger.js';

const router: Router = Router();

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

const tradingSessions = new Map<string, TradingService>();

router.post('/init', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = (req as any).token;
    const validated = OTPRequestSchema.parse(req.body);

    const derivAPI = new DerivAPIService(token);
    const otpData = await derivAPI.getOTP(validated.accountId);

    const tradingService = new TradingService(otpData.url);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      // wsManager agora é público — acesso direto sem erro TS2341
      tradingService.wsManager.once('connected', () => {
        clearTimeout(timeout);
        resolve(null);
      });

      tradingService.wsManager.once('error', (error: any) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    const sessionId = token.slice(0, 20);
    tradingSessions.set(sessionId, tradingService);

    logger.info('Trading session initialized', { accountId: validated.accountId, sessionId });

    res.json({
      success: true,
      data: {
        sessionId,
        status: tradingService.getStatus(),
      },
    });
  } catch (error) {
    logger.error('Failed to initialize trading session', { error });
    next(error);
  }
});

router.get('/symbols', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = (req.query.sessionId as string) || (req as any).token.slice(0, 20);
    const tradingService = tradingSessions.get(sessionId);

    if (!tradingService) {
      return res.status(400).json({ success: false, error: 'Invalid session', message: 'Please initialize a trading session first' });
    }

    const symbols = await tradingService.getActiveSymbols(false);
    logger.info('Active symbols retrieved', { count: symbols.length });

    res.json({ success: true, data: { symbols } });
  } catch (error) {
    logger.error('Failed to get symbols', { error });
    next(error);
  }
});

router.get('/contracts/:symbol', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = (req.query.sessionId as string) || (req as any).token.slice(0, 20);
    const tradingService = tradingSessions.get(sessionId);

    if (!tradingService) {
      return res.status(400).json({ success: false, error: 'Invalid session' });
    }

    const contracts = await tradingService.getContractsFor(req.params.symbol);
    res.json({ success: true, data: { contracts } });
  } catch (error) {
    logger.error('Failed to get contracts', { error, symbol: req.params.symbol });
    next(error);
  }
});

router.post('/proposal', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = (req.body.sessionId as string) || (req as any).token.slice(0, 20);
    const tradingService = tradingSessions.get(sessionId);

    if (!tradingService) {
      return res.status(400).json({ success: false, error: 'Invalid session' });
    }

    const validated = ProposalRequestSchema.parse(req.body);
    const proposal = await tradingService.getProposal(validated);

    logger.info('Proposal retrieved', { symbol: validated.underlyingSymbol });
    res.json({ success: true, data: { proposal } });
  } catch (error) {
    logger.error('Failed to get proposal', { error });
    next(error);
  }
});

router.post('/buy', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = (req.body.sessionId as string) || (req as any).token.slice(0, 20);
    const tradingService = tradingSessions.get(sessionId);

    if (!tradingService) {
      return res.status(400).json({ success: false, error: 'Invalid session' });
    }

    const validated = BuyRequestSchema.parse(req.body);
    const result = await tradingService.buy(validated);

    logger.info('Contract purchased', { contractId: result.contractId });
    res.json({ success: true, data: { contract: result } });
  } catch (error) {
    logger.error('Failed to buy contract', { error });
    next(error);
  }
});

router.post('/sell', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = (req.body.sessionId as string) || (req as any).token.slice(0, 20);
    const tradingService = tradingSessions.get(sessionId);

    if (!tradingService) {
      return res.status(400).json({ success: false, error: 'Invalid session' });
    }

    const validated = SellRequestSchema.parse(req.body);
    const result = await tradingService.sell(validated);

    logger.info('Contract sold', { contractId: result.contractId });
    res.json({ success: true, data: { result } });
  } catch (error) {
    logger.error('Failed to sell contract', { error });
    next(error);
  }
});

router.get('/balance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = (req.query.sessionId as string) || (req as any).token.slice(0, 20);
    const tradingService = tradingSessions.get(sessionId);

    if (!tradingService) {
      return res.status(400).json({ success: false, error: 'Invalid session' });
    }

    const balance = await tradingService.getBalance();
    res.json({ success: true, data: { balance } });
  } catch (error) {
    logger.error('Failed to get balance', { error });
    next(error);
  }
});

router.get('/portfolio', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = (req.query.sessionId as string) || (req as any).token.slice(0, 20);
    const tradingService = tradingSessions.get(sessionId);

    if (!tradingService) {
      return res.status(400).json({ success: false, error: 'Invalid session' });
    }

    const portfolio = await tradingService.getPortfolio();
    res.json({ success: true, data: { portfolio } });
  } catch (error) {
    logger.error('Failed to get portfolio', { error });
    next(error);
  }
});

router.get('/profit-table', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = (req.query.sessionId as string) || (req as any).token.slice(0, 20);
    const tradingService = tradingSessions.get(sessionId);

    if (!tradingService) {
      return res.status(400).json({ success: false, error: 'Invalid session' });
    }

    const profitTable = await tradingService.getProfitTable({
      limit: parseInt(req.query.limit as string) || 25,
      offset: parseInt(req.query.offset as string) || 0,
    });

    res.json({ success: true, data: { profitTable } });
  } catch (error) {
    logger.error('Failed to get profit table', { error });
    next(error);
  }
});

export default router;
