import { AccountBase } from 'plaid';

export interface PlaidConnection {
  provider: string;
  accessToken: string;
}

export interface CEXConnection {
  provider: string;
  apiKey: string;
  apiSecret: string;
}

export interface WalletConnection {
  address: string;
  chain: 'ethereum' | 'polygon';
  lastUpdated: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'bank' | 'broker' | 'cex' | 'wallet';
  balance: string;
  lastUpdated: Date;
  provider: string;
}

export interface PlaidAccountExtended extends AccountBase {
  institution_id?: string;
} 