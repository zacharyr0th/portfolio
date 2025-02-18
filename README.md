# Portfolio

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

A portfolio management dashboard that integrates banks, brokers, CEXes, and chains into a unified platform.

## Features

- **Portfolio Tracking**

  - LIVE NOW: Chain Integrations (Solana, Aptos, Sui)
  - LIVE NOW: CEX Integrations (Kraken, Gemini)
  - COMING SOON: Broker and Bank Integrations (via Plaid)

- **Portfolio Management**

  - LIVE NOW: Balance tracking across all assets
  - COMING SOON: Aggregated Transaction history
  - COMING SOON: Tax documentation automation
  - COMING SOON: Transfers, Deposits, Withdrawals, Swaps, etc.

- **Real-Time Data**
  - LIVE NOW: Live Market Data Integration (via Finnhub & CMC)
  - LIVE NOW: Interactive Charts & Graphs
  - COMING SOON: Price Alerts & Notifications

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (comes with Node.js)
- API keys and wallets configured in `.env.local`

### Installation

1. Clone the repository:

```bash
git clone https://github.com/zacharyr0th/portfolio.git
cd portfolio
```

2. Install dependencies:

```bash
npm install
```

3. Copy the environment variables file:

```bash
cp .env.example .env.local
```

4. Configure your environment variables in `.env.local`

5. Start the development server:

```bash
npm run dev
```

## .env.local Configuration

The following API keys and configurations are required:

### Blockchains

- Solana RPC URL - recommended: https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
- Aptos RPC URL - recommended: https://fullnode.mainnet.aptoslabs.com/
- Sui RPC URL - recommended: https://fullnode.mainnet.sui.io/443

### Market Data APIs

- Finnhub API Key (Stock Market Data) https://finnhub.io/docs/api/introduction
- CMC API Key (Cryptocurrency Data) https://coinmarketcap.com/api/

### CEXes

- Kraken API Credentials https://docs.kraken.com/api/docs/rest-api/add-order
- Gemini API Credentials https://docs.gemini.com/rest-api/

### Wallets

- SOLANA_WALLET_x=public-key
- APTOS_WALLET_x=public-key
- SUI_WALLET_x=public-key

Each wallet added with the above format will be automatically detected and added to the portfolio.

See [.env.example](.env.example) for all required environment variables.

## Development

- `npm run dev` - Start development server
- `npm run build` - Build production bundle
- `npm run reset` - Clean install (removes node_modules, clears cache, and reinstalls)

See [package.json](package.json) for all available scripts.

## Integration Guidelines

Portfolio is designed to be extensible, with the ability to add as many blockchains and CEXes as possible.

### Quick Links

- [Blockchain Integration Guide](lib/chains/README.md)
- [CEX Integration Guide](lib/cex/README.md)

**Blockchain Examples:**

- [Solana Integration](lib/chains/solana/README.md) - Complete implementation with SPL token support
- [Aptos Integration](lib/chains/aptos/README.md) - Move-based chain example
- [Sui Integration](lib/chains/sui/README.md) - Alternative Move-based implementation

**Exchange Examples:**

- [Kraken Integration](lib/cex/kraken/README.md) - Full-featured exchange implementation
- [Gemini Integration](lib/cex/gemini/README.md) - Alternative implementation style

## Contributing

Please read [Contributing Guidelines](CONTRIBUTING.md) for detailed information about our development process, branch structure, and code submission guidelines.

Quick start:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/NewFeature`)
3. Commit your changes (`git commit -m 'Add some NewFeature'`)
4. Push to the branch (`git push origin feature/NewFeature`)
5. Open a Pull Request

When adding a new integration:

1. Follow the appropriate guide ([Chains](lib/chains/README.md) or [CEX](lib/cex/README.md))
2. Use existing implementations as references
3. Ensure all checklist items are completed

# Portfolio Management Tool

A cross-platform portfolio management tool that integrates with various wallets, exchanges, and financial services.

## Features

- Multi-chain wallet support (Ethereum, Polygon, Arbitrum, Optimism, Base, Solana, Aptos, Sui)
- Centralized exchange integration (Gemini, etc.)
- Real-time balance tracking
- Portfolio analytics and visualization
- Secure API integration

## Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env.local` and configure your environment variables:

```bash
cp .env.example .env.local
```

### Gemini Integration

To enable Gemini exchange integration:

1. Create an API key on Gemini:

   - Log in to your Gemini account
   - Go to Account Settings > API
   - Create a new API key with "Fund Management" permissions
   - Copy the API key and secret

2. Add your Gemini credentials to `.env.local`:

```bash
GEMINI_API_KEY=your_gemini_api_key
GEMINI_API_SECRET=your_gemini_api_secret
```

The integration will automatically fetch your Gemini account balances and update them in real-time.

## Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Security

- API keys are stored securely in environment variables
- All API requests are made server-side to protect credentials
- Rate limiting and error handling are implemented for all API calls
- Sensitive data is never exposed to the client

## License

MIT
