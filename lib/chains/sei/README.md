# Sei API Integration

This directory contains the API routes for interacting with the Sei blockchain. The integration uses three main services:

1. Sei Node API for account balances and token data
2. SimpleHash API for NFT data
3. QuickNode API for real-time token prices

## File Structure

| Category          | File                                                                                                            | Size  | Description                                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------- |
| **Core API**      |
|                   | [`app/api/sei/route.ts`](./route.ts)                                                                            | 6.1KB | • Primary API handler<br>• GET/POST endpoints<br>• Rate limiting (30 req/min)<br>• Response caching (30s TTL) |
|                   | [`lib/chains/sei/index.ts`](../../../lib/chains/sei/index.ts)                                                   | -     | • Core chain functionality<br>• Network configuration<br>• Balance & price updates                            |
| **UI Components** |
|                   | [`app/components/accounts/cards/crypto/SeiCard.tsx`](../../../app/components/accounts/cards/crypto/SeiCard.tsx) | -     | • Main account display<br>• Real-time updates (60s)<br>• NFT gallery modal                                    |
|                   | [`lib/chains/sei/TokenBalance.tsx`](../../../lib/chains/sei/TokenBalance.tsx)                                   | -     | • Token balance display<br>• Price formatting<br>• Token metadata                                             |
| **Types & Utils** |
|                   | [`lib/chains/sei/types.ts`](../../../lib/chains/sei/types.ts)                                                   | -     | • Type definitions<br>• API interfaces<br>• Component props                                                   |
|                   | [`lib/chains/sei/utils.ts`](../../../lib/chains/sei/utils.ts)                                                   | -     | • RPC helpers<br>• Data formatting<br>• Balance calculations                                                  |
|                   | [`lib/chains/sei/constants.ts`](../../../lib/chains/sei/constants.ts)                                           | -     | • Token addresses<br>• Network endpoints<br>• Default configs                                                 |
| **Assets**        |
|                   | [`public/icons/chain-icons/sei.webp`](../../../public/icons/chain-icons/sei.webp)                               | -     | • Chain icon                                                                                                  |

### Required Environment Variables

```bash
# RPC Configuration
SEI_RPC_URL=https://sei-rpc.polkachu.com

# API Keys
SIMPLEHASH_API_KEY=your_simplehash_api_key
QUICKNODE_API_KEY=your_quicknode_api_key
```

## 1. Sei Node Integration

### Base Configuration

```typescript
const SEI_RPC_URL = process.env.SEI_RPC_URL || "https://sei-rpc.polkachu.com";
```

### Endpoints

#### GET /api/sei/balance

Fetches token balances for a Sei address.

**Query Parameters:**

- `address`: The Sei account address to fetch balances for

**Response Format:**

```typescript
{
  balances: [
    {
      token: {
        symbol: string
        name: string
        decimals: number
        address: string
        chain: string
        type: string
      }
      balance: string
      uiAmount: number
      valueUsd: number
    }
  ],
  prices: Record<string, { price: number; timestamp: number }>,
  totalValueUsd: number
}
```

#### POST /api/sei

Makes internal RPC requests to the Sei network.

**Request Body:**

```typescript
{
  endpoint: string; // The Sei RPC endpoint to call
}
```

### Known Token Addresses

```typescript
const KNOWN_TOKENS = {
  SEI: "usei",
  USDC: "ibc/...", // Add USDC IBC token address
};
```

## 2. SimpleHash NFT Integration

### Base Configuration

```typescript
const SIMPLEHASH_API_KEY = process.env.SIMPLEHASH_API_KEY;
const SIMPLEHASH_BASE_URL = "https://api.simplehash.com/api/v0/nfts/owners";
```

### Functionality

- Fetches NFT collections and tokens owned by a Sei address
- Provides rich metadata including:
  - Collection info
  - Token attributes
  - Market data
  - Rarity rankings

### Example Response

```typescript
{
  nfts: [
    {
      collection: {
        name: string
        description: string
        image_url: string
      },
      token: {
        name: string
        token_id: string
        image_url: string
        attributes: Array<{
          trait_type: string
          value: string
        }>
      },
      market_data: {
        floor_price: number
        last_sale_price: number
      }
    }
  ]
}
```

## 3. QuickNode API Integration

### Base Configuration

```typescript
const QUICKNODE_BASE_URL = process.env.QUICKNODE_API_URL;
```

### Functionality

Fetches real-time token prices for Sei tokens.

### Implementation

```typescript
async function fetchPrices(
  tokenAddresses: string[],
): Promise<Record<string, number>> {
  const response = await fetch(QUICKNODE_BASE_URL, {
    method: "POST",
    headers: {
      "x-api-key": process.env.QUICKNODE_API_KEY,
    },
    body: JSON.stringify({
      tokens: tokenAddresses,
    }),
  });
  // ... process response
}
```

## Usage Example

```typescript
// Fetch account balances and prices
const response = await fetch("/api/sei/balance?address=sei1...");
const data = await response.json();

// Access token balances
const balances = data.balances;

// Access token prices
const prices = data.prices;

// Get total portfolio value
const totalValue = data.totalValueUsd;
```

## Error Responses

The API returns appropriate HTTP status codes:

- 400: Bad Request (invalid address format)
- 429: Too Many Requests (rate limit exceeded)
- 408: Request Timeout
- 502: Bad Gateway (upstream API error)
- 500: Internal Server Error

Each error response includes a descriptive message:

```typescript
{
  error: string; // Human-readable error message
}
```
