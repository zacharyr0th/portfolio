# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability within this project, please send an email to zacharyroth@pm.me. All security vulnerabilities will be promptly addressed.

## Environment Variables

This project uses environment variables for configuration. Never commit actual API keys, secrets, or sensitive credentials to the repository.

1. Use `.env.example` as a template
2. Create your own `.env.local` file for local development
3. Keep all sensitive credentials in `.env.local` which is gitignored

## API Keys and Secrets

- Never commit API keys or secrets to the repository
- Use environment variables for all sensitive credentials
- When contributing, use placeholder values in examples and documentation

## Wallet Addresses

- Be cautious when sharing wallet addresses
- Use test wallets for development and examples
- Never commit private keys

## Required Environment Variables

The following environment variables are required to run the application. Copy these to your `.env.local` file and fill in the appropriate values.

### Core Configuration
```bash
# Base URLs for API and frontend
API_URL=http://localhost:3000/api     # Your API endpoint
APP_URL=http://localhost:3000         # Your frontend URL

# Default blockchain network
DEFAULT_CHAIN=aptos                   # Options: aptos, solana, sui, base
```

### Blockchain RPC Endpoints
```bash
# Mainnet RPC URLs - Get these from your preferred RPC provider
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com     # Example: Helius, QuickNode
APTOS_RPC_URL=https://fullnode.mainnet.aptoslabs.com   # Aptos Labs endpoint
SUI_RPC_URL=https://fullnode.mainnet.sui.io            # Sui Foundation endpoint
```

### Market Data APIs
```bash
# Price feed and market data credentials
FINNHUB_API_KEY=                      # Get from https://finnhub.io
CMC_API_KEY=                         # Get from https://coinmarketcap.com/api
```

### Exchange Integration (Optional)
```bash
# Kraken Exchange API credentials
KRAKEN_API_KEY=                      # Get from Kraken exchange
KRAKEN_API_PRIVATE_KEY=              # Get from Kraken exchange

# Gemini Exchange API credentials
GEMINI_API_KEY=                      # Get from Gemini exchange
GEMINI_API_SECRET=                   # Get from Gemini exchange

# Coinbase Integration
COINBASE_API_KEY=                    # Get from Coinbase
COINBASE_SECRET_KEY=                 # Get from Coinbase
COINBASE_API_SECRET=                 # Get from Coinbase
```

### Banking Integration (Optional)
```bash
# Plaid API credentials
PLAID_ENV=sandbox                    # Options: sandbox, development, production
PLAID_CLIENT_ID=                     # Get from Plaid Dashboard
PLAID_SECRET=                        # Get from Plaid Dashboard
```

> **Note**: Never commit your actual API keys or secrets. The values above are examples or placeholders.
> Each service (Plaid, Coinbase, etc.) has its own process for obtaining API credentials. Visit their
> respective documentation for detailed instructions.

## Security Best Practices

1. Keep dependencies updated
2. Use environment variables for configuration
3. Implement proper error handling
4. Follow secure coding practices
5. Use HTTPS for all API calls
6. Implement proper input validation
7. Use secure authentication methods
8. Regular security audits
9. Keep sensitive data encrypted
10. Implement proper access controls

## Contributing

When contributing to this project:

1. Never commit sensitive information
2. Use placeholder values in examples
3. Follow secure coding practices
4. Report security issues privately
5. Keep dependencies updated 