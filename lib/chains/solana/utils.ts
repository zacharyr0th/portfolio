import { logger } from "@/lib/utils/core/logger";
import {
  RPC_CONFIG,
  ERROR_MESSAGES,
  DUST_THRESHOLDS,
  API_RATE_LIMITS,
} from "./constants";
import type { TokenBalance, SolanaToken } from "./types";

// Cache NumberFormat instances for better performance
const numberFormatCache = new Map<string, Intl.NumberFormat>();

function getNumberFormat(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = JSON.stringify(options);
  let formatter = numberFormatCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", options);
    numberFormatCache.set(key, formatter);
  }
  return formatter;
}

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  const defaultOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  };
  return getNumberFormat(options ?? defaultOptions).format(value);
}

export function formatCurrency(
  value: number,
  compact: boolean = false,
): string {
  const options: Intl.NumberFormatOptions = {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: compact && Math.abs(value) >= 1000 ? "compact" : "standard",
    compactDisplay: "short",
  };

  return getNumberFormat(options).format(value);
}

// Request timestamps for rate limiting
const requestTimestamps = {
  rpc: [] as number[],
  jupiter: [] as number[],
  simplehash: [] as number[],
};

/**
 * Check if we can make a request based on rate limits
 */
export function canMakeRequest(type: keyof typeof API_RATE_LIMITS): boolean {
  const now = Date.now();
  const limits = API_RATE_LIMITS[type];
  const key = type.toLowerCase() as keyof typeof requestTimestamps;
  const timestamps = requestTimestamps[key];

  // Remove old timestamps
  while (
    timestamps?.length > 0 &&
    timestamps[0] &&
    timestamps[0] < now - limits.WINDOW_MS
  ) {
    timestamps.shift();
  }

  return (timestamps?.length ?? 0) < limits.MAX_REQUESTS;
}

/**
 * Track a request for rate limiting
 */
export function trackRequest(type: keyof typeof API_RATE_LIMITS): void {
  const key = type.toLowerCase() as keyof typeof requestTimestamps;
  requestTimestamps[key].push(Date.now());
}

/**
 * Retry an operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    timeout?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? RPC_CONFIG.MAX_RETRIES;
  const retryDelay = options.retryDelay ?? RPC_CONFIG.RETRY_DELAY;
  const timeout = options.timeout ?? RPC_CONFIG.TIMEOUT;

  let retries = maxRetries;
  let lastError: Error;

  while (retries >= 0) {
    try {
      return await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(ERROR_MESSAGES.TIMEOUT)), timeout),
        ),
      ]);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (retries > 0) {
        const attempt = maxRetries - retries + 1;
        const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff

        options.onRetry?.(attempt, lastError);

        logger.warn("Operation failed, retrying...", {
          attempt,
          maxRetries,
          delay,
          error: lastError.message,
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
        retries--;
      } else {
        throw lastError;
      }
    }
  }

  throw lastError!;
}

/**
 * Process items in batches
 */
export async function batchProcess<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R>,
): Promise<R[]> {
  const batches = Array(Math.ceil(items.length / batchSize))
    .fill(null)
    .map((_, i) => items.slice(i * batchSize, (i + 1) * batchSize));

  return Promise.all(batches.map(processor));
}

/**
 * Filter out dust amounts from token balances
 */
export function filterDustAmounts(balances: TokenBalance[]): TokenBalance[] {
  return balances.filter((balance) => {
    const { token, uiAmount } = balance;

    // Get appropriate dust threshold
    let threshold = DUST_THRESHOLDS.DEFAULT;
    if (token.symbol === "SOL") {
      threshold = DUST_THRESHOLDS.SOL;
    } else if (token.symbol === "USDC" || token.symbol === "USDT") {
      threshold = DUST_THRESHOLDS.USDC;
    }

    return uiAmount >= threshold;
  });
}

/**
 * Validate Solana address format
 */
export function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

/**
 * Format token balance for display
 */
export function formatTokenBalance(
  balance: TokenBalance,
  options: {
    includeSymbol?: boolean;
    maxDecimals?: number;
    minDecimals?: number;
  } = {},
): string {
  const { includeSymbol = true, maxDecimals = 6, minDecimals = 2 } = options;

  const formatted = balance.uiAmount.toLocaleString(undefined, {
    maximumFractionDigits: maxDecimals,
    minimumFractionDigits: minDecimals,
  });

  return includeSymbol ? `${formatted} ${balance.token.symbol}` : formatted;
}

/**
 * Clean up resources and reset state
 */
export function cleanup(): void {
  Object.keys(requestTimestamps).forEach((key) => {
    requestTimestamps[key as keyof typeof requestTimestamps] = [];
  });
}
