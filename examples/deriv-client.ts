/**
 * Exemplo de Cliente TypeScript para a API Deriv Trading Backend
 * Este arquivo mostra como integrar com o backend a partir do frontend Next.js
 */

class DerivTradingClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private sessionId: string | null = null;

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.loadTokenFromStorage();
  }

  /**
   * 1. Iniciar Login
   */
  async initiateLogin() {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'GET',
      });

      const data = await response.json();
      return data.authUrl; // Redirecionar usuário para esta URL
    } catch (error) {
      console.error('Login initiation failed:', error);
      throw error;
    }
  }

  /**
   * 2. Iniciar Signup
   */
  async initiateSignup(options: {
    campaign?: string;
    affiliateId?: string;
  } = {}) {
    try {
      const params = new URLSearchParams({
        ...(options.campaign && { utm_campaign: options.campaign }),
        ...(options.affiliateId && { utm_source: options.affiliateId }),
      });

      const response = await fetch(
        `${this.baseUrl}/api/auth/signup?${params}`,
        { method: 'GET' }
      );

      const data = await response.json();
      return data.signupUrl;
    } catch (error) {
      console.error('Signup initiation failed:', error);
      throw error;
    }
  }

  /**
   * 3. Tratar Callback OAuth (na página de callback)
   */
  async handleOAuthCallback(code: string, state: string) {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/callback`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        this.accessToken = data.data.accessToken;
        this.saveTokenToStorage(data.data.accessToken);
        return data.data;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('OAuth callback failed:', error);
      throw error;
    }
  }

  /**
   * 4. Listar Contas
   */
  async getAccounts() {
    try {
      const response = await fetch(`${this.baseUrl}/api/accounts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch accounts');

      const data = await response.json();
      return data.data.accounts;
    } catch (error) {
      console.error('Get accounts failed:', error);
      throw error;
    }
  }

  /**
   * 5. Criar Nova Conta
   */
  async createAccount(type: 'demo' | 'real' = 'demo') {
    try {
      const response = await fetch(`${this.baseUrl}/api/accounts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currency: 'USD',
          group: 'row',
          accountType: type,
        }),
      });

      if (!response.ok) throw new Error('Failed to create account');

      const data = await response.json();
      return data.data.account;
    } catch (error) {
      console.error('Create account failed:', error);
      throw error;
    }
  }

  /**
   * 6. Inicializar Sessão de Trading (WebSocket)
   */
  async initializeTradingSession(accountId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/api/trading/init`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId }),
      });

      if (!response.ok) throw new Error('Failed to initialize trading session');

      const data = await response.json();
      this.sessionId = data.data.sessionId;
      return data.data;
    } catch (error) {
      console.error('Initialize trading session failed:', error);
      throw error;
    }
  }

  /**
   * 7. Obter Símbolos de Trading
   */
  async getSymbols() {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/trading/symbols?sessionId=${this.sessionId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch symbols');

      const data = await response.json();
      return data.data.symbols;
    } catch (error) {
      console.error('Get symbols failed:', error);
      throw error;
    }
  }

  /**
   * 8. Obter Contratos para um Símbolo
   */
  async getContracts(symbol: string) {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/trading/contracts/${symbol}?sessionId=${this.sessionId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch contracts');

      const data = await response.json();
      return data.data.contracts;
    } catch (error) {
      console.error('Get contracts failed:', error);
      throw error;
    }
  }

  /**
   * 9. Obter Proposta de Preço
   */
  async getProposal(options: {
    contractType: string;
    underlyingSymbol: string;
    amount: number;
    duration: number;
  }) {
    try {
      const response = await fetch(`${this.baseUrl}/api/trading/proposal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...options,
          sessionId: this.sessionId,
          basis: 'stake',
          durationUnit: 't',
          currency: 'USD',
          subscribe: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to get proposal');

      const data = await response.json();
      return data.data.proposal;
    } catch (error) {
      console.error('Get proposal failed:', error);
      throw error;
    }
  }

  /**
   * 10. Comprar Contrato
   */
  async buyContract(proposalId: string, maxPrice: number) {
    try {
      const response = await fetch(`${this.baseUrl}/api/trading/buy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proposalId,
          maxPrice,
          sessionId: this.sessionId,
        }),
      });

      if (!response.ok) throw new Error('Failed to buy contract');

      const data = await response.json();
      return data.data.contract;
    } catch (error) {
      console.error('Buy contract failed:', error);
      throw error;
    }
  }

  /**
   * 11. Vender Contrato
   */
  async sellContract(contractId: number, minPrice: number = 0) {
    try {
      const response = await fetch(`${this.baseUrl}/api/trading/sell`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractId,
          minPrice,
          sessionId: this.sessionId,
        }),
      });

      if (!response.ok) throw new Error('Failed to sell contract');

      const data = await response.json();
      return data.data.result;
    } catch (error) {
      console.error('Sell contract failed:', error);
      throw error;
    }
  }

  /**
   * 12. Obter Saldo
   */
  async getBalance() {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/trading/balance?sessionId=${this.sessionId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch balance');

      const data = await response.json();
      return data.data.balance;
    } catch (error) {
      console.error('Get balance failed:', error);
      throw error;
    }
  }

  /**
   * 13. Obter Portfolio (Contratos Abertos)
   */
  async getPortfolio() {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/trading/portfolio?sessionId=${this.sessionId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch portfolio');

      const data = await response.json();
      return data.data.portfolio;
    } catch (error) {
      console.error('Get portfolio failed:', error);
      throw error;
    }
  }

  /**
   * 14. Obter Tabela de Lucros
   */
  async getProfitTable(limit: number = 25) {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/trading/profit-table?sessionId=${this.sessionId}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch profit table');

      const data = await response.json();
      return data.data.profitTable;
    } catch (error) {
      console.error('Get profit table failed:', error);
      throw error;
    }
  }

  /**
   * 15. Fazer Logout
   */
  async logout() {
    try {
      await fetch(`${this.baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      this.accessToken = null;
      this.sessionId = null;
      this.removeTokenFromStorage();
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  /**
   * Métodos auxiliares para storage
   */
  private saveTokenToStorage(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('deriv_token', token);
    }
  }

  private loadTokenFromStorage() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('deriv_token');
    }
  }

  private removeTokenFromStorage() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('deriv_token');
    }
  }

  /**
   * Getters
   */
  getAccessToken() {
    return this.accessToken;
  }

  getSessionId() {
    return this.sessionId;
  }

  isAuthenticated() {
    return !!this.accessToken;
  }
}

// Exportar para uso em frontend
export default DerivTradingClient;

/**
 * EXEMPLO DE USO NO FRONTEND (React)
 * 
 * import { useEffect, useState } from 'react';
 * import DerivTradingClient from '@/lib/deriv-client';
 * 
 * export function TradingDashboard() {
 *   const [client] = useState(() => new DerivTradingClient());
 *   const [balance, setBalance] = useState(null);
 * 
 *   useEffect(() => {
 *     async function fetchData() {
 *       try {
 *         const bal = await client.getBalance();
 *         setBalance(bal);
 *       } catch (error) {
 *         console.error(error);
 *       }
 *     }
 * 
 *     if (client.isAuthenticated()) {
 *       fetchData();
 *     }
 *   }, [client]);
 * 
 *   return (
 *     <div>
 *       <h1>Saldo: ${balance?.balance}</h1>
 *     </div>
 *   );
 * }
 */
