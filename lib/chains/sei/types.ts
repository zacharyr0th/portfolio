export interface SeiToken {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  chain: string;
  type: string;
}

export interface TokenBalance {
  token: SeiToken;
  balance: string;
  uiAmount: number;
  valueUsd: number;
}

export interface TokenPrice {
  price: number;
  timestamp: number;
}

export interface SeiBalanceResponse {
  balances: TokenBalance[];
  prices: Record<string, TokenPrice>;
  totalValueUsd: number;
}

export interface SeiNft {
  collection: {
    name: string;
    description: string;
    image_url: string;
  };
  token: {
    name: string;
    token_id: string;
    image_url: string;
    attributes: Array<{
      trait_type: string;
      value: string;
    }>;
  };
  market_data?: {
    floor_price?: number;
    last_sale_price?: number;
  };
}
