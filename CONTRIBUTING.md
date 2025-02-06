# Contributions

## Branch Structure

We follow a modified Git Flow workflow with the following branches:

- `main`: Production-ready code, always stable
- `dev`: Integration branch for completed features and general development
- `feature/*`: Individual feature branches (e.g., `feature/chains`, `feature/ui-redesign`)
- `fix/*`: Bug fix branches (e.g., `fix/solana-balance`)
- `docs/*`: Documentation updates (e.g., `docs/api-reference`)

## Development Workflow

1. **Fork & Clone**

   ```bash
   git clone https://github.com/yourusername/portfolio.git
   cd portfolio
   ```

2. **Branch Creation**

   - For new features:
     ```bash
     git checkout -b feature/your-feature-name dev
     ```
   - For bug fixes:
     ```bash
     git checkout -b fix/bug-description dev
     ```
   - For documentation:
     ```bash
     git checkout -b docs/section-name dev
     ```

3. **Staying Updated**

   ```bash
   git remote add upstream https://github.com/zacharyr0th/portfolio.git
   git fetch upstream
   git merge upstream/dev
   ```

4. **Submitting Changes**
   - Push your branch to your fork
   - Create a Pull Request to merge into `dev`
   - Fill out the PR template completely

## Branch Naming

- Features: `feature/descriptive-name`
- Bug fixes: `fix/bug-description`
- Documentation: `docs/section-name`
- Chain Integration: `feature/chain-chainname`
- Exchange Integration: `feature/cex-exchangename`

## Commit Messages

Follow these guidelines for commit messages:

- Keep the first line under 72 characters
- Use present tense ("add feature" not "added feature")
- Reference issues and pull requests when relevant

Examples:

```
feat: add Binance chain integration
fix: correct Solana balance calculation
docs: update chain integration guide
test: add unit tests for Kraken API
```

## Code Review

1. All changes require at least one review
2. Address any review comments before merging
3. Maintain a clean commit history
4. Squash commits if requested

## Integration Guidelines

When adding new integrations, we have detailed guides for each type:

### Blockchain Integration

For adding new blockchain support, follow the [Blockchain Integration Guide](lib/chains/README.md). This guide covers:

- Directory structure and required files
- RPC integration requirements
- Token management and price feeds
- Error handling and caching strategies

### Exchange Integration

For adding new exchange support, follow the [CEX Integration Guide](lib/cex/README.md). This guide covers:

- Directory structure and required files
- API integration and authentication
- Balance and order tracking
- Rate limiting and error handling

Both guides include:

- Step-by-step implementation instructions
- Security best practices
- Example implementations
- Complete checklists
