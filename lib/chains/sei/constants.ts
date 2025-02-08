// RPC Configuration
export const SEI_RPC_URL =
  process.env.SEI_RPC_URL || "https://sei-mainnet.rpc.extrnode.com";
export const QUICKNODE_BASE_URL =
  process.env.QUICKNODE_SEI_ENDPOINT ||
  "https://necessary-old-flower.sei-pacific.quiknode.pro/d65fe35c722255c7db2360e2e4af15621db7a4db";
export const SIMPLEHASH_BASE_URL =
  "https://api.simplehash.com/api/v0/nfts/owners";

// API Keys
export const QUICKNODE_API_KEY = process.env.QUICKNODE_API_KEY;
export const SIMPLEHASH_API_KEY = process.env.SIMPLEHASH_API_KEY;

// Chain Configuration
export const CHAIN_ID = "pacific-1";
export const CHAIN_NAME = "Sei";
export const CHAIN_SYMBOL = "SEI";
export const CHAIN_DECIMALS = 6;

// Known Tokens
export const KNOWN_TOKENS = {
  SEI: "usei",
  USDC: "ibc/8E27BA2D5493AF5636760E354E46004562C46AB7EC0CC4C1CA14E9E20E2545B5", // USDC from Axelar
  ATOM: "ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9", // ATOM from Cosmos Hub
  OSMO: "ibc/ED07A3391A112B175915CD8FAF43A2DA8E4790EDE12566649D0C2F97716B8518", // OSMO from Osmosis
};

// API Endpoints
export const API_ENDPOINTS = {
  BALANCE: "/api/sei/balance",
  NFT: "/api/sei/nft",
  PRICE: "/api/sei/price",
};

// Cache Configuration
export const CACHE_CONFIG = {
  BALANCE_TTL: 30, // 30 seconds
  PRICE_TTL: 60, // 60 seconds
  NFT_TTL: 300, // 5 minutes
};

// Rate Limiting
export const RATE_LIMIT = {
  REQUESTS_PER_MINUTE: 30,
  WINDOW_MS: 60 * 1000, // 1 minute
};

// Explorer Configuration
export const EXPLORER_CONFIG = {
  BASE_URL: "https://www.seiscan.app",
  ACCOUNT_URL: "https://www.seiscan.app/accounts",
  TX_URL: "https://www.seiscan.app/txs",
  TOKEN_URL: "https://www.seiscan.app/tokens",
};

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_ADDRESS: "Invalid Sei address provided",
  RATE_LIMIT_EXCEEDED: "Rate limit exceeded. Please try again later.",
  FETCH_ERROR: "Failed to fetch data from Sei network",
  TIMEOUT: "Request timed out",
  INTERNAL_ERROR: "Internal server error",
};

// Validation
export const ADDRESS_REGEX = /^sei1[a-zA-Z0-9]{40}$/;
export const TRANSACTION_REGEX = /^[A-F0-9]{64}$/i;

// UI Configuration
export const UI_CONFIG = {
  REFRESH_INTERVAL: 60000, // 1 minute
  MAX_TOKENS_DISPLAY: 100,
  MAX_NFTS_DISPLAY: 50,
  COPY_TIMEOUT: 2000,
};
