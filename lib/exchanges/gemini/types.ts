export interface GeminiConfig {
  apiKey: string;
  apiSecret: string;
  accountName?: string;
}

export interface GeminiBalance {
  type: string;
  currency: string;
  amount: string;
  available: string;
  availableForWithdrawal: string;
}

export interface GeminiTicker {
  bid: string;
  ask: string;
  last: string;
  volume: {
    BTC?: string;
    USD?: string;
    timestamp: number;
  };
}
