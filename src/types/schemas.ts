import { z } from 'zod';

// Auth Schemas
export const LoginRequestSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State is required'),
});

export const AuthCallbackSchema = z.object({
  code: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
  state: z.string().optional(),
});

export const OTPRequestSchema = z.object({
  accountId: z.string().min(1, 'Account ID is required'),
});

// Trading Schemas
export const ProposalRequestSchema = z.object({
  contractType: z.enum(['CALL', 'PUT', 'HIGHER', 'LOWER', 'DIGITEVEN', 'DIGITODD', 'ONETOUCH', 'NOTOUCH', 'MULTUP', 'MULTDOWN', 'ACCU']),
  underlyingSymbol: z.string().min(1),
  amount: z.number().positive(),
  basis: z.enum(['stake', 'payout']).default('stake'),
  duration: z.number().positive(),
  durationUnit: z.enum(['s', 'm', 'h', 'd', 't']).default('t'),
  currency: z.string().default('USD'),
  subscribe: z.boolean().default(true),
});

export const BuyRequestSchema = z.object({
  proposalId: z.string().min(1, 'Proposal ID is required'),
  maxPrice: z.number().positive('Max price must be positive'),
});

export const SellRequestSchema = z.object({
  contractId: z.number().int().positive(),
  minPrice: z.number().min(0, 'Min price cannot be negative'),
});

export const ContractUpdateSchema = z.object({
  contractId: z.number().int().positive(),
  limitOrder: z.object({
    stopLoss: z.number().optional(),
    takeProfit: z.number().optional(),
  }).optional(),
});

// Account Schemas
export const AccountCreationSchema = z.object({
  currency: z.enum(['USD']),
  group: z.enum(['row']),
  accountType: z.enum(['demo', 'real']),
});

// WebSocket Schemas
export const WebSocketMessageSchema = z.object({
  type: z.string(),
  payload: z.any().optional(),
  reqId: z.string().optional(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type AuthCallback = z.infer<typeof AuthCallbackSchema>;
export type OTPRequest = z.infer<typeof OTPRequestSchema>;
export type ProposalRequest = z.infer<typeof ProposalRequestSchema>;
export type BuyRequest = z.infer<typeof BuyRequestSchema>;
export type SellRequest = z.infer<typeof SellRequestSchema>;
export type ContractUpdate = z.infer<typeof ContractUpdateSchema>;
export type AccountCreation = z.infer<typeof AccountCreationSchema>;
export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;
