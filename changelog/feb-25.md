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
