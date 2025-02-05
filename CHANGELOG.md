# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2025-02-06

### Fixed
- Fixed React duplicate key warning in [`app/components/accounts/cards/variants/CexCard.tsx`](app/components/accounts/cards/variants/CexCard.tsx) by creating unique keys that combine account ID and token symbol
- Prevents potential issues with duplicate token symbols (like STAPT) across different accounts or sources

### Changed
- Updated TokenBalance component keys in CexCard to use format `${account.id}-${token.symbol}` for better uniqueness 