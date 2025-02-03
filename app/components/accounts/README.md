# Accounts System

This directory contains the core account management system that handles different types of financial accounts:

- 🔑 **Wallets** - Crypto wallets across different chains
- 🏦 **Banks** - Traditional bank accounts
- 📈 **Brokers** - Investment/trading accounts
- 💱 **CEX** - Cryptocurrency exchanges
- 💳 **Credit** - Credit cards
- 💰 **Debit** - Debit cards

## Directory Structure

- `cards/` - UI components for displaying different account types
- `config.ts` - Main account configuration and data
- `service.ts` - Account data management and utilities
- `AccountList.tsx` - Main account list view component
- `AccountNav.tsx` - Navigation and filtering component

## Adding New Institutions/Platforms

### 1. Add Platform Icon

1. Add your platform's icon (preferably in .webp format) to:

    ```
    public/icons/account-icons/{platform-name}.webp
    ```

2. Register the icon in `cards/constants.tsx` under `PLATFORM_ICONS`:
    ```typescript
    export const PLATFORM_ICONS = {
        // ... existing icons ...
        'New Platform': { src: '/icons/account-icons/new-platform.webp', opacity: 90 },
    }
    ```

### 2. Add Platform Configuration

In `config.ts`, add your platform to the appropriate section:

#### For Banks

```typescript
banks: {
  newBank: {
    id: 'new-bank-id',
    platform: 'New Bank' as const,
    type: 'bank' as const,
    name: 'New Bank Account',
    category: 'checking',
    plaid: {
      enabled: true,
      status: 'pending' as const,
    },
  },
}
```

#### For Brokers

```typescript
brokers: {
  newBroker: {
    id: 'new-broker-id',
    platform: 'New Broker' as const,
    type: 'broker' as const,
    name: 'Trading Account',
    category: 'Cash',
    plaid: {
      enabled: true,
      status: 'pending' as const,
    },
  },
}
```

#### For CEX

```typescript
cex: {
  newExchange: {
    id: 'new-exchange-id',
    platform: 'New Exchange' as const,
    type: 'cex' as const,
    name: 'Exchange Account',
  },
}
```

#### For Credit/Debit Cards

Add to `creditAccounts` or `debitAccounts` arrays:

```typescript
{
  id: 'new-card-id',
  name: 'New Card',
  type: 'credit', // or 'debit'
  platform: 'New Platform',
  value: 0,
  lastUpdated: new Date().toISOString(),
  // ... other card-specific fields
}
```

### 3. Add Platform URL

Add the platform's URL in `cards/constants.tsx` under `PLATFORM_URLS`:

```typescript
export const PLATFORM_URLS = {
    bank: {
        // ... existing URLs ...
        'New Platform': 'https://www.newplatform.com',
    },
    // Add to appropriate category (broker/cex/credit/debit)
}
```

### 4. Update Types (if needed)

If adding a new platform type, update the platform type definitions in `cards/types.ts`:

```typescript
export type BankPlatform = 'Existing Platform' | 'New Platform'
```

## Adding New Chains

1. Add chain to `SUPPORTED_CHAINS` in `config.ts`:

```typescript
export const SUPPORTED_CHAINS = ['aptos', 'solana', 'sui', 'new-chain'] as const
```

2. Add chain icon to `public/icons/account-icons/` and register in `CHAIN_ICONS`:

```typescript
export const CHAIN_ICONS = {
    // ... existing chains ...
    'new-chain': { src: '/icons/account-icons/new-chain.webp', opacity: 50 },
}
```

3. Implement chain handler in `lib/chains/new-chain/`

## Best Practices

1. Always use TypeScript's `as const` assertions for type safety
2. Keep icons consistent (use .webp format, similar dimensions)
3. Maintain consistent naming conventions across configurations
4. Add appropriate metadata (descriptions, URLs, features) for new platforms
5. Test new additions with the account display components
