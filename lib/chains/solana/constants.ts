import type { SolanaToken } from "./types";

// Essential token addresses
export const NATIVE_SOL_MINT = "So11111111111111111111111111111111111111112";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

// Program IDs
export const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const ASSOCIATED_TOKEN = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";

// RPC Configuration
export const RPC_CONFIG = {
  ENDPOINTS: [
    "https://api.mainnet-beta.solana.com",
    "https://solana-api.projectserum.com",
    "https://rpc.ankr.com/solana",
  ],
  COMMITMENT: "confirmed" as const,
  TIMEOUT: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  BATCH_SIZE: 100,
  RATE_LIMIT: {
    MAX_REQUESTS: 100,
    WINDOW_MS: 10000,
  },
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  TOKEN_METADATA_TTL: 24 * 60 * 60 * 1000, // 24 hours
  PRICE_TTL: 30 * 1000, // 30 seconds
  NFT_METADATA_TTL: 60 * 60 * 1000, // 1 hour
} as const;

// Dust Thresholds
export const DUST_THRESHOLDS = {
  SOL: 0.000001 as const, // 1000 lamports
  USDC: 0.000001 as const, // Minimum for stablecoins
  USDT: 0.000001 as const, // Minimum for stablecoins
  DEFAULT: 0.000001 as const,
} as const;

// Default price data
export const DEFAULT_PRICE = {
  price: 0,
  priceChange24h: 0,
  lastUpdated: 0,
  confidence: 0,
} as const;

// API Rate Limits
export const API_RATE_LIMITS = {
  JUPITER: {
    MAX_REQUESTS: 600, // 600 req/min
    WINDOW_MS: 60 * 1000,
  },
  RPC: {
    MAX_REQUESTS: 100,
    WINDOW_MS: 10 * 1000,
  },
  SIMPLEHASH: {
    MAX_REQUESTS: 50,
    WINDOW_MS: 10 * 1000,
  },
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_ADDRESS: "Invalid Solana address format",
  RPC_ERROR: "Error communicating with Solana RPC",
  RATE_LIMIT: "Rate limit exceeded",
  TIMEOUT: "Request timed out",
  INVALID_RESPONSE: "Invalid response from RPC",
  NO_BALANCE: "No balance data available",
} as const;

// Validation
export const ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const SIGNATURE_REGEX = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;

// Monitoring
export const MONITORING_CONFIG = {
  ERROR_THRESHOLD: 5, // Number of errors before circuit breaker
  ERROR_WINDOW: 60 * 1000, // 1 minute window
  SLOW_THRESHOLD: 5000, // 5 seconds
} as const;
