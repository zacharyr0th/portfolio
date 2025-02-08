# Solana API Integration

This directory contains the optimized API routes and components for interacting with the Solana blockchain. The integration uses several key services with built-in fallbacks and error handling:

1. **Solana RPC API** - Account balances and token data

   - Multiple RPC endpoints with failover
   - Automatic retries with exponential backoff
   - Request batching and rate limiting

2. **Jupiter Price API v2** - Real-time token prices (Primary)

   - High confidence price discovery
   - 30-second cache with revalidation
   - Built-in rate limiting (600 req/min)

3. **CoinMarketCap API** - Fallback price source

   - Automatic fallback for missing Jupiter prices
   - 5-minute cache for cost efficiency
   - 24h price change data

4. **SimpleHash API** - NFT data and metadata
   - Rich collection metadata
   - Floor price tracking
   - Market analytics

## File Structure

| Category            | File                                                                       | Size  | Description                                                                                                   |
| ------------------- | -------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------- |
| **Core API**        |
|                     | [`index.ts`](./index.ts)                                                   | 9.6KB | • Core chain functionality<br>• Balance fetching<br>• Dynamic token discovery<br>• Multi-source price updates |
|                     | [`jupiter.ts`](./jupiter.ts)                                               | 6.8KB | • Jupiter integration<br>• Quote fetching<br>• Price calculations<br>• Caching logic                          |
| **API Routes**      |
|                     | [`app/api/solana/route.ts`](../../app/api/solana/route.ts)                 | 8.6KB | • Jupiter Price API v2 integration<br>• RPC request handling<br>• Rate limiting & caching                     |
|                     | [`app/api/solana/jupiter-api.txt`](../../app/api/solana/jupiter-api.txt)   | 8.4KB | • Jupiter API documentation<br>• API schemas<br>• Example requests                                            |
|                     | [`app/api/solana/balance/route.ts`](../../app/api/solana/balance/route.ts) | 6.7KB | • Balance fetching endpoint<br>• Token account parsing<br>• Error handling                                    |
| **NFT Integration** |
|                     | [`app/api/simplehash/route.ts`](../../app/api/simplehash/route.ts)         | 3.4KB | • NFT data endpoint<br>• Collection metadata<br>• Market data                                                 |
|                     | [`lib/data/simplehash.ts`](../../lib/data/simplehash.ts)                   | 9.7KB | • NFT data fetching<br>• Collection tracking<br>• Market analytics                                            |
| **Price Services**  |
|                     | [`lib/data/cmc.ts`](../../lib/data/cmc.ts)                                 | 3.8KB | • Price fallback service<br>• Token metadata<br>• 24h price changes                                           |
| **UI Components**   |
|                     | [`TokenBalance.tsx`](./TokenBalance.tsx)                                   | 3.9KB | • Token balance display<br>• Price formatting<br>• Real-time updates                                          |
| **Types & Utils**   |
|                     | [`types.ts`](./types.ts)                                                   | 1.9KB | • Type definitions<br>• API interfaces<br>• Component props                                                   |
|                     | [`utils.ts`](./utils.ts)                                                   | 1.1KB | • Helper functions<br>• Data formatting<br>• Balance calculations                                             |
|                     | [`constants.ts`](./constants.ts)                                           | 1.2KB | • Essential addresses<br>• Program IDs<br>• Configuration                                                     |

## Key Features

### 1. Optimized Data Fetching

```typescript
// Rate limiting with type safety
const requestTimestamps = {
  rpc: [] as number[],
  jupiter: [] as number[],
  simplehash: [] as number[],
};

export function canMakeRequest(type: keyof typeof API_RATE_LIMITS): boolean {
  const now = Date.now();
  const limits = API_RATE_LIMITS[type];
  const key = type.toLowerCase() as keyof typeof requestTimestamps;
  const timestamps = requestTimestamps[key];

  while (
    timestamps?.length > 0 &&
    timestamps[0] &&
    timestamps[0] < now - limits.WINDOW_MS
  ) {
    timestamps.shift();
  }

  return (timestamps?.length ?? 0) < limits.MAX_REQUESTS;
}
```

### 2. Intelligent Caching

```typescript
export const CACHE_CONFIG = {
  TOKEN_METADATA_TTL: 24 * 60 * 60 * 1000, // 24 hours
  PRICE_TTL: 30 * 1000, // 30 seconds
  NFT_METADATA_TTL: 60 * 60 * 1000, // 1 hour
} as const;
```

### 3. Smart Dust Filtering

```typescript
export const DUST_THRESHOLDS = {
  SOL: 0.000001 as const, // 1000 lamports
  USDC: 0.000001 as const, // Minimum for stablecoins
  USDT: 0.000001 as const, // Minimum for stablecoins
  DEFAULT: 0.000001 as const,
} as const;
```

### 4. Robust Error Handling

```typescript
export const ERROR_MESSAGES = {
  INVALID_ADDRESS: "Invalid Solana address format",
  RPC_ERROR: "Error communicating with Solana RPC",
  RATE_LIMIT: "Rate limit exceeded",
  TIMEOUT: "Request timed out",
  INVALID_RESPONSE: "Invalid response from RPC",
  NO_BALANCE: "No balance data available",
} as const;
```

## Component Architecture

### SolanaCard Component

- **Immediate Data Loading**: Fetches balances on mount
- **Optimized Updates**: 5-minute refresh interval when expanded
- **Error Recovery**: Automatic retries with exponential backoff
- **Memory Management**: Cleanup on unmount

```typescript
// Initial fetch on mount
useEffect(() => {
  fetchBalances();
}, [fetchBalances]);

// Refresh when expanded
useEffect(() => {
  if (isOpen) {
    const intervalId = setInterval(fetchBalances, 300000);
    return () => clearInterval(intervalId);
  }
}, [isOpen, fetchBalances]);
```

### TokenBalance Component

- **Efficient Rendering**: Memoized calculations
- **Type-Safe Props**: Strict TypeScript interfaces
- **Responsive Updates**: Real-time price integration
- **Flexible Display**: Configurable formatting options

## Performance Optimizations

### 1. Request Management

- **Rate Limiting**: Per-service request tracking
- **Request Batching**: Efficient bulk operations
- **Connection Pooling**: Reuse connections when possible

### 2. Data Processing

- **Memoized Formatters**: Cache number formatters
- **Efficient Filtering**: Smart dust amount handling
- **Type-Safe Operations**: Strict TypeScript usage

### 3. Error Recovery

- **Circuit Breaker**: Prevent cascade failures
- **Exponential Backoff**: Smart retry mechanism
- **Fallback Endpoints**: Multiple RPC sources

## Security Measures

### 1. Input Validation

```typescript
export const ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const SIGNATURE_REGEX = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;
```

### 2. Rate Protection

```typescript
export const API_RATE_LIMITS = {
  JUPITER: {
    MAX_REQUESTS: 600,
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
```

### 3. Monitoring

```typescript
export const MONITORING_CONFIG = {
  ERROR_THRESHOLD: 5, // Circuit breaker threshold
  ERROR_WINDOW: 60 * 1000, // 1-minute window
  SLOW_THRESHOLD: 5000, // 5-second warning
} as const;
```

## Required Environment Variables

```bash
# RPC Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# API Keys
CMC_API_KEY=your_coinmarketcap_api_key
SIMPLEHASH_API_KEY=your_simplehash_api_key
```

## Usage Example

```typescript
// Initialize handler with optimized configuration
const solanaHandler = new BaseChainHandler({
  chainName: "solana",
  fetchBalancesImpl: async (publicKey) => {
    // Validate input
    if (!isValidSolanaAddress(publicKey)) {
      throw new Error(ERROR_MESSAGES.INVALID_ADDRESS);
    }

    // Fetch with retries and rate limiting
    const balances = await withRetry(() => fetchTokenBalances(publicKey), {
      maxRetries: RPC_CONFIG.MAX_RETRIES,
      retryDelay: RPC_CONFIG.RETRY_DELAY,
      timeout: RPC_CONFIG.TIMEOUT,
    });

    // Filter dust amounts
    const filteredBalances = filterDustAmounts(balances);

    // Get prices with fallback
    const prices = await fetchPricesWithFallback(
      filteredBalances.map((b) => b.token.tokenAddress),
    );

    return processBalancesWithPrices(filteredBalances, prices);
  },
});

// Clean usage with proper error handling
try {
  const { balances } = await solanaHandler.fetchBalances(publicKey);
  logger.info("Successfully fetched balances", {
    count: balances.length,
    totalValue: balances.reduce((sum, b) => sum + (b.valueUsd || 0), 0),
  });
} catch (error) {
  logger.error("Failed to fetch balances", {
    error: error instanceof Error ? error.message : String(error),
    publicKey,
  });
}
```
