# CEX Integration Guide

This directory contains the integration layer for centralized cryptocurrency exchanges. Follow this guide to add support for new exchanges.

## Directory Structure

```
lib/cex/
├── [exchange]/              # Exchange-specific directory (e.g., kraken, gemini)
│   ├── index.ts            # Main exchange handler implementation
│   ├── types.ts            # Exchange-specific type definitions
│   ├── TokenBalance.tsx    # (Optional) Custom balance display component
│   └── utils.ts            # (Optional) Exchange-specific utilities
├── baseHandler.ts          # Common utilities and base classes
├── types.ts               # Shared type definitions
└── index.ts              # Export all exchange handlers
```

## Step-by-Step Integration Guide

### 1. Create Exchange Directory
```bash
mkdir lib/cex/[exchange]
```

### 2. Implement Required Files

#### a. types.ts
```typescript
// Define exchange-specific types
export interface ExchangeApiResponse<T> {
    result: T;
    error?: string[];
}

export interface ExchangeBalance {
    // Map exchange-specific balance format
}

// Add any other exchange-specific types
```

#### b. index.ts
```typescript
import { ExchangeHandler, TokenBalance, TokenPrice } from '../types';
import { Cache, CACHE_TTL, CACHE_STALE_TIME } from '../baseHandler';

// Initialize caches
const balanceCache = new Cache<TokenBalance[]>(CACHE_TTL, CACHE_STALE_TIME);
const priceCache = new Cache<Record<string, TokenPrice>>(CACHE_TTL, CACHE_STALE_TIME);

export const exchangeHandler: ExchangeHandler = {
    fetchBalances: async () => {
        // Implement balance fetching with caching
        // Use error handling and retries
    },
    
    fetchPrices: async () => {
        // Implement price fetching with caching
    },
    
    BalanceDisplay: // Implement display component
};
```

### 3. Create API Route

Create `app/api/[exchange]/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { validateApiKey, handleRateLimit } from '@/lib/utils';

export async function POST(req: Request) {
    try {
        // Validate request and API keys
        // Implement rate limiting
        // Handle exchange API calls
        // Return formatted response
    } catch (error) {
        // Error handling
    }
}
```

### 4. Environment Setup

Add to `.env.example`:
```env
[EXCHANGE]_API_KEY=your_api_key_here
[EXCHANGE]_API_SECRET=your_api_secret_here
```

### 5. Update Exports

In `lib/cex/index.ts`:
```typescript
export * from './[exchange]';
```

## Implementation Recommendations

| Category | Recommendations | Implementation Details |
|----------|--------------|----------------------|
| **Security** | API Key Protection | - Never expose API keys in code<br>- Store in environment variables<br>- Use secure key rotation practices |
| | Request Signing | - Implement proper HMAC signing<br>- Validate request timestamps<br>- Use nonce values when required |
| | Rate Limiting | - Implement request throttling<br>- Track API usage<br>- Respect exchange limits |
| | Response Validation | - Validate all API responses<br>- Check data integrity<br>- Verify response signatures |
| **Error Handling** | Retry Logic | - Implement exponential backoff<br>- Set maximum retry attempts<br>- Handle different error types |
| | Logging | - Log all critical operations<br>- Track error frequencies<br>- Monitor performance metrics |
| | Fallbacks | - Return cached data when appropriate<br>- Implement graceful degradation<br>- Provide meaningful error messages |
| | Cache Management | - Handle cache invalidation on errors<br>- Maintain data consistency<br>- Implement recovery strategies |
| **Caching** | Implementation | - Use provided Cache class<br>- Configure appropriate cache keys<br>- Handle cache misses |
| | SWR Pattern | - Implement stale-while-revalidate<br>- Set stale thresholds<br>- Handle background refreshes |
| | TTL Management | - Set appropriate TTL values<br>- Configure stale times<br>- Handle cache expiration |
| | Invalidation | - Define clear invalidation rules<br>- Handle partial updates<br>- Maintain cache consistency |
| **Type Safety** | Type Management | - Maintain strict typing<br>- Use TypeScript features effectively<br>- Avoid type assertions |
| | Type Mapping | - Map exchange types to common interfaces<br>- Handle type conversions<br>- Document type relationships |
| | Validation | - Validate at API boundaries<br>- Implement runtime checks<br>- Handle edge cases |
| | Documentation | - Document type transformations<br>- Maintain type definitions<br>- Comment complex mappings |

## Example Integration

See the Kraken or Gemini implementations for reference:
- `lib/cex/kraken/` - Complete implementation example
- `lib/cex/gemini/` - Alternative implementation style

## Checklist

- [ ] Create exchange directory structure
- [ ] Implement types and interfaces
- [ ] Create exchange handler
- [ ] Set up API route
- [ ] Add environment variables
- [ ] Implement error handling
- [ ] Set up caching
- [ ] Update exports
- [ ] Document exchange-specific details
