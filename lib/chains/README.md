# Blockchain Integration Guide

This directory contains the integration layer for blockchain networks. Follow this guide to add support for new chains.

## Directory Structure

```
lib/chains/
├── [chain]/                # Chain-specific directory (e.g., solana, aptos, sui)
│   ├── index.ts           # Main chain handler implementation
│   ├── types.ts           # Chain-specific type definitions
│   ├── TokenBalance.tsx   # Custom balance display component
│   └── utils.ts           # Chain-specific utilities
├── baseHandler.ts         # Common utilities and base classes
├── config.ts             # Chain configuration and RPC endpoints
├── types.ts              # Shared type definitions
└── index.ts             # Export all chain handlers
```

## Step-by-Step Integration Guide

### 1. Create Chain Directory
```bash
mkdir lib/chains/[chain]
```

### 2. Implement Required Files

#### a. types.ts
```typescript
// Define chain-specific types
export interface TokenBalance {
    mint: string;          // Token address/mint
    symbol: string;        // Token symbol
    name: string;          // Token name
    decimals: number;      // Token decimals
    balance: string;       // Raw balance
    uiBalance: number;     // Formatted balance
    logoURI?: string;      // Optional token logo
}

export interface TokenPrice {
    price: number;
    priceChange24h: number;
}

// Add any other chain-specific types
```

#### b. index.ts
```typescript
import { ChainHandler, TokenBalance, TokenPrice } from '../types';
import { Cache, CACHE_TTL, CACHE_STALE_TIME } from '../baseHandler';
import { getEndpoint } from '../config';

// Initialize caches
const balanceCache = new Cache<TokenBalance[]>(CACHE_TTL, CACHE_STALE_TIME);
const priceCache = new Cache<Record<string, TokenPrice>>(CACHE_TTL, CACHE_STALE_TIME);

export const chainHandler: ChainHandler = {
    fetchBalances: async (publicKey: string) => {
        // Implement balance fetching with caching
        // Use error handling and retries
    },
    
    fetchPrices: async () => {
        // Implement price fetching with caching
    },
    
    getExplorerUrl: (publicKey: string, accountId: string) => {
        // Return block explorer URL
    },
    
    BalanceDisplay: // Implement display component
    
    clearCache: () => {
        balanceCache.clear();
        priceCache.clear();
    }
};
```

### 3. Create API Route

Create `app/api/[chain]/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { validatePublicKey, handleRateLimit } from '@/lib/utils';

export async function POST(req: Request) {
    try {
        // Validate request and public key
        // Implement rate limiting
        // Handle chain RPC calls
        // Return formatted response
    } catch (error) {
        // Error handling
    }
}
```

### 4. Update Configuration

In `lib/chains/config.ts`:
```typescript
export const CHAIN_CONFIG = {
    [chain]: {
        name: 'Chain Name',
        rpcEndpoint: process.env.CHAIN_RPC_ENDPOINT,
        explorerUrl: 'https://explorer...',
        tokenListUrl: 'https://token-list...',
    }
}
```

### 5. Update Exports

In `lib/chains/index.ts`:
```typescript
export * from './[chain]';
```

## Implementation Requirements

| Category | Requirements | Implementation Details |
|----------|--------------|----------------------|
| **RPC Integration** | Connection Management | - Handle RPC endpoint configuration<br>- Implement connection pooling<br>- Monitor connection health |
| | Request Handling | - Implement proper request formatting<br>- Handle RPC-specific data types<br>- Validate responses |
| | Rate Limiting | - Respect RPC rate limits<br>- Implement request queuing<br>- Handle concurrent requests |
| **Token Management** | Token Lists | - Integrate with token lists<br>- Handle token metadata<br>- Cache token information |
| | Balance Tracking | - Track native token balances<br>- Handle SPL/fungible tokens<br>- Support NFTs if applicable |
| | Price Updates | - Implement price feeds<br>- Handle price updates<br>- Maintain price history |
| **Error Handling** | RPC Errors | - Handle node failures<br>- Implement fallback nodes<br>- Retry failed requests |
| | Data Validation | - Validate on-chain data<br>- Handle malformed responses<br>- Implement data sanitization |
| | Recovery | - Implement graceful degradation<br>- Handle network outages<br>- Maintain service availability |
| **Performance** | Caching | - Cache chain data<br>- Implement SWR pattern<br>- Handle cache invalidation |
| | Optimization | - Batch RPC requests<br>- Minimize network calls<br>- Optimize data structures |
| | Monitoring | - Track RPC performance<br>- Monitor error rates<br>- Log important events |

## Example Integration

See the existing implementations for reference:
- `lib/chains/solana/` - Complete Solana integration
- `lib/chains/aptos/` - Aptos Move-based chain
- `lib/chains/sui/` - Sui Move-based chain

## Support

For questions or issues:
1. Check existing chain implementations
2. Review chain documentation
3. Test thoroughly in development environment
4. Document chain-specific considerations

## Checklist

- [ ] Create chain directory structure
- [ ] Implement types and interfaces
- [ ] Create chain handler
- [ ] Set up RPC integration
- [ ] Configure token handling
- [ ] Implement error handling
- [ ] Set up caching
- [ ] Add explorer integration
- [ ] Update exports
- [ ] Document chain-specific details 