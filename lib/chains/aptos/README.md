# Aptos API Integration

This directory contains the API routes for interacting with the Aptos blockchain. The integration uses three main services:

1. Aptos Fullnode API for account balances and token data
2. SimpleHash API for NFT data
3. Panora API for real-time token prices

## File Structure

| Category          | File                                                                                                                | Size  | Description                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------- |
| **Core API**      |
|                   | [`app/api/aptos/route.ts`](./route.ts)                                                                              | 11KB  | • Primary API handler<br>• GET/POST endpoints<br>• Rate limiting (30 req/min)<br>• Response caching (30s TTL) |
|                   | [`lib/chains/aptos/index.ts`](../../../lib/chains/aptos/index.ts)                                                   | 6.2KB | • Core chain functionality<br>• Network configuration<br>• Balance & price updates                            |
| **UI Components** |
|                   | [`app/components/accounts/cards/crypto/AptosCard.tsx`](../../../app/components/accounts/cards/crypto/AptosCard.tsx) | -     | • Main account display<br>• Real-time updates (60s)<br>• NFT gallery modal                                    |
|                   | [`lib/chains/aptos/TokenBalance.tsx`](../../../lib/chains/aptos/TokenBalance.tsx)                                   | 2.3KB | • Token balance display<br>• Price formatting<br>• Token metadata                                             |
| **Types & Utils** |
|                   | [`lib/chains/aptos/types.ts`](../../../lib/chains/aptos/types.ts)                                                   | 491B  | • Type definitions<br>• API interfaces<br>• Component props                                                   |
|                   | [`lib/chains/aptos/utils.ts`](../../../lib/chains/aptos/utils.ts)                                                   | 7.6KB | • RPC helpers<br>• Data formatting<br>• Balance calculations                                                  |
|                   | [`lib/chains/aptos/constants.ts`](../../../lib/chains/aptos/constants.ts)                                           | 2.0KB | • Token addresses<br>• Network endpoints<br>• Default configs                                                 |
| **Assets**        |
|                   | [`public/icons/chain-icons/aptos.webp`](../../../public/icons/chain-icons/aptos.webp)                               | -     | • Chain icon                                                                                                  |

### Required Environment Variables

```bash
# RPC Configuration
APTOS_RPC_URL=https://fullnode.mainnet.aptoslabs.com/v1

# API Keys
SIMPLEHASH_API_KEY=your_simplehash_api_key
PANORA_API_KEY=your_panora_api_key
```

## 1. Aptos Fullnode Integration

### Base Configuration

```typescript
const APTOS_RPC_URL =
  process.env.APTOS_RPC_URL || "https://fullnode.mainnet.aptoslabs.com/v1";
```

### Endpoints

#### GET /api/aptos

Fetches token balances for an Aptos address.

**Query Parameters:**

- `address`: The Aptos account address to fetch balances for

**Response Format:**

```typescript
{
  tokens: {
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
}
```

#### POST /api/aptos

Makes internal RPC requests to the Aptos network.

**Request Body:**

```typescript
{
  endpoint: string; // The Aptos RPC endpoint to call
}
```

### Known Token Addresses

```typescript
const KNOWN_TOKENS = {
  APT: "0x1::aptos_coin::AptosCoin",
  USDC: "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC",
};
```

## 2. SimpleHash NFT Integration

### Base Configuration

```typescript
const SIMPLEHASH_API_KEY = process.env.SIMPLEHASH_API_KEY;
const SIMPLEHASH_BASE_URL = "https://api.simplehash.com/api/v0/nfts/owners";
```

### Functionality

- Fetches NFT collections and tokens owned by an Aptos address
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

## 3. Panora Price API Integration

### Base Configuration

```typescript
const PANORA_BASE_URL = "https://api.panora.exchange";
```

### Functionality

Fetches real-time token prices for Aptos tokens.

### Implementation

```typescript
async function fetchPrices(
  tokenAddresses: string[],
): Promise<Record<string, number>> {
  const queryString = `tokenAddress=${tokenAddresses.join(",")}`;
  const response = await fetch(`${PANORA_BASE_URL}/prices?${queryString}`, {
    method: "GET",
    headers: {
      "x-api-key": process.env.PANORA_API_KEY,
    },
  });
  // ... process response
}
```

## Usage Example

```typescript
// Fetch account balances and prices
const response = await fetch("/api/aptos?address=0x123...abc");
const data = await response.json();

// Access token balances
const balances = data.tokens.balances;

// Access token prices
const prices = data.tokens.prices;

// Get total portfolio value
const totalValue = data.tokens.totalValueUsd;
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
