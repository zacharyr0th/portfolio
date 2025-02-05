# Blockchain Integration Guide

This guide provides step-by-step instructions for adding new blockchain network support to the portfolio platform.

## Directory Structure

Each chain integration must follow this structure:
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

## Implementation Requirements

#### types.ts
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

#### index.ts
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

## API Route Implementation

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

## Configuration

Update `lib/chains/config.ts`:
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

## Implementation Checklist

- [ ] Implement types and interfaces
- [ ] Create chain handler
- [ ] Set up RPC integration
- [ ] Configure token handling
- [ ] Implement error handling
- [ ] Set up caching
- [ ] Add explorer integration
- [ ] Update exports
- [ ] Write documentation
- [ ] Update main README

## Example Implementations

See these complete implementations for reference:
- `solana/` - Complete implementation with SPL token support
- `aptos/` - Move-based chain example
- `sui/` - Alternative Move-based implementation 