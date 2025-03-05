import { PlaidLinkOptions } from 'react-plaid-link';

export type AccountType = 'bank' | 'broker' | 'cex' | 'wallet';

export interface Account {
  id: string;
  name: string;
  type: string;
  balance: string;
  lastUpdated: Date;
  provider: string;
}

export interface ConnectionConfig {
  type: AccountType;
  provider: string;
  credentials?: {
    apiKey?: string;
    apiSecret?: string;
  };
  walletAddress?: string;
}

class AccountService {
  // Plaid configuration
  private plaidConfig: PlaidLinkOptions = {
    clientName: 'Your Portfolio App',
    env: 'sandbox', // Change to 'development' or 'production'
    product: ['auth', 'transactions'],
    language: 'en',
    countryCodes: ['US'],
  };

  // Connect bank or broker via Plaid
  async connectPlaidAccount(publicToken: string, accountType: 'bank' | 'broker') {
    try {
      // Exchange public token for access token
      const response = await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicToken }),
      });

      if (!response.ok) throw new Error('Failed to exchange token');

      const { accessToken } = await response.json();
      
      // Store the access token securely for future use
      await this.storeAccessToken(accessToken, accountType);

      return true;
    } catch (error) {
      console.error('Plaid connection error:', error);
      throw error;
    }
  }

  // Connect CEX via API keys
  async connectCEX(config: ConnectionConfig) {
    try {
      const response = await fetch('/api/cex/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) throw new Error('Failed to connect CEX');

      return await response.json();
    } catch (error) {
      console.error('CEX connection error:', error);
      throw error;
    }
  }

  // Connect wallet
  async connectWallet(address: string, chain: string) {
    try {
      const response = await fetch('/api/wallet/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, chain }),
      });

      if (!response.ok) throw new Error('Failed to connect wallet');

      return await response.json();
    } catch (error) {
      console.error('Wallet connection error:', error);
      throw error;
    }
  }

  // Fetch account balances and transactions
  async fetchAccountData(accountId: string): Promise<Account> {
    try {
      const response = await fetch(`/api/accounts/${accountId}`);
      if (!response.ok) throw new Error('Failed to fetch account data');
      return await response.json();
    } catch (error) {
      console.error('Account data fetch error:', error);
      throw error;
    }
  }

  // Store access tokens securely
  private async storeAccessToken(token: string, type: string) {
    try {
      await fetch('/api/accounts/store-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, type }),
      });
    } catch (error) {
      console.error('Token storage error:', error);
      throw error;
    }
  }
}

export const accountService = new AccountService(); 