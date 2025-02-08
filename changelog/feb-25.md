# Changes for February 5, 2025

### Security

- Removed `NEXT_PUBLIC_` prefix from environment variables for improved security
- Implemented rate limiting on blockchain RPC endpoints
- Enhanced API key management and security headers

### Added

- Token hiding functionality for wallet and CEX accounts
- Jupiter price integration for Solana tokens
- NFT support with SimpleHash integration
- EVM chain support (Ethereum, Polygon, Arbitrum, Optimism, Base)
- Smart decimal precision handling for token balances
- Advanced caching mechanisms for wallet data and API responses

### Changed

- Updated environment variable handling to server-side only
- Improved token balance display and caching strategy
- Enhanced chain handler implementations with better error recovery
- Optimized portfolio context updates

### Fixed

- Resolved React duplicate key warnings in CexCard
- Fixed memory leaks in wallet and CEX cards
- Addressed token balance precision issues
- Resolved RPC endpoint connection problems

### Performance

- Implemented efficient caching for formatters and API responses
- Added request deduplication and batch processing
- Optimized component rendering and state updates

# Changes for February 6, 2025

### Security

- Added security notices for API integrations
- Improved environment variable handling for exchange APIs
- Enhanced error handling with sensitive data masking
- Added `.securityrc.js` for centralized security configuration
- Implemented Husky git hooks for enhanced security checks

### Added

- Improved icon organization with dedicated folders for CEX and chains
- Enhanced error handling for API integrations
- SimpleHash integration for EVM token balances and NFT balances across EVM, Aptos, Solana, and Sui
- New scripts directory for development tooling

### Changed

- Reorganized icon structure for better maintainability
- Migrated from `.eslintrc.json` to `.eslintrc.js` for better configuration
- Updated core documentation (README, CONTRIBUTING, SECURITY)
- Restructured account components for better maintainability
- Updated configuration files (Next.js, PostCSS, Tailwind, TypeScript)

### Fixed

- Addressed TypeScript errors in service layer
- Resolved balance formatting inconsistencies
- Improved error handling in exchange API calls
- Enhanced error boundary implementation
- Optimized component rendering patterns

### Performance

- Enhanced caching for exchange API responses
- Improved balance fetching with parallel requests
- Optimized icon loading with lazy loading strategy
- Implemented request batching for token balances
- Enhanced utility hooks for better performance
- Improved media query handling and debouncing

# Changes for February 8, 2024

### Security

- Removed exposed QuickNode endpoint from environment configuration
- Enhanced environment variable documentation and examples
- Improved API documentation organization with dedicated files:
  - Added Aptos Node API documentation (`app/api/aptos/aptos-node-api.json`)
  - Added Panora Price API documentation (`app/api/aptos/panora-api.txt`)
  - Added Jupiter Price API v2 documentation (`app/api/solana/jupiter-api.txt`)

### Added

- Massive expansion of chain support (see `lib/chains/README.md` for complete details):
  - Full support (Native, Fungible, NFTs) for 19 chains including:
    - L1: Aptos, Ethereum, Solana, Bitcoin, Flow, Celo
    - L2: Arbitrum One, Base, Blast, Optimism, and more
    - Sidechains: Polygon, Gnosis
  - Native & Fungible support for 10 additional L2 chains
  - Limited support for 19 more chains including Avalanche, Fantom, BSC
- New chain-specific documentation and implementations:
  - Aptos integration guide and utilities (`lib/chains/aptos/README.md`)
  - Solana integration details and Jupiter DEX support (`lib/chains/solana/README.md`)
  - EVM+ enhanced functionality documentation (`lib/chains/evm+/`)
- New chain handlers with comprehensive features:
  - Sei chain integration with QuickNode RPC support
  - Bitcoin support via SimpleHash integration
  - Enhanced EVM chain support with expanded functionality
- API integrations and documentation:
  - Aptos Node API and Panora price feed integration
  - Solana Jupiter v2 price API integration
  - QuickNode RPC integration for enhanced reliability
- Dedicated balance and price routes:
  - Solana balance tracking with SPL token support
  - Sui price aggregation from multiple sources
  - Chain-specific balance routes for improved accuracy
- Comprehensive test suite:
  - Unit tests for all chain handlers
  - Integration tests for RPC endpoints
  - Price feed validation tests
  - Balance calculation verification

### Changed

- Reorganized account components into logical subdirectories:
  - `crypto/` for cryptocurrency-related cards:
    - Chain-specific cards (Aptos, Bitcoin, EVM, Sei, Solana, Sui)
    - Exchange integration cards (CEX)
    - Generic wallet cards
  - `tradfi/` for traditional finance cards:
    - Bank account cards
    - Broker account cards
    - Credit/Debit card components
- Enhanced chain handler architecture:
  - Renamed `evm/` to `evm+/` with expanded capabilities
  - Standardized handler interfaces across chains
  - Improved error handling and recovery mechanisms
  - Enhanced type safety and validation
- Improved configuration management:
  - Centralized RPC endpoint configuration
  - Enhanced environment variable organization
  - Standardized chain configuration patterns
  - Removed deprecated endpoints and routes

### Fixed

- Improved error handling in chain-specific routes:
  - Better RPC failure recovery
  - Enhanced error messages and logging
  - Graceful fallback mechanisms
- Enhanced type safety across chain handlers:
  - Stricter TypeScript definitions
  - Improved interface consistency
  - Better null handling
- Optimized caching mechanisms:
  - Smart cache invalidation
  - Chain-specific caching strategies
  - Improved memory usage

### Performance

- Implemented efficient request batching:
  - Parallel token balance fetching
  - Optimized RPC calls
  - Reduced network overhead
- Enhanced caching strategy:
  - Chain-specific cache durations
  - Smart cache invalidation
  - Memory-efficient storage
- Optimized API handling:
  - Request deduplication
  - Response normalization
  - Error recovery with exponential backoff

For more detailed information about specific chain implementations and features, refer to:

- Main Chain Documentation: `lib/chains/README.md`
- Aptos Integration Guide: `lib/chains/aptos/README.md`
- Solana Integration Guide: `lib/chains/solana/README.md`
- API Documentation in respective `/api/` directories
