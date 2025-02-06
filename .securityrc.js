module.exports = {
    rules: {
        // Security Rules
        'secure-api-keys': {
            description: 'Ensure API keys and secrets are not committed',
            severity: 'error',
            pattern: '(?<!\\s*//\\s*)(?<!\\s*\\*\\s*)(api[_-]?key|api[_-]?secret|password|secret|token|private[_-]?key)\\s*[=:]\\s*[\'|"][^\'"]+[\'|"]',
            message: 'API keys and secrets should not be committed. Use environment variables instead.',
            environments: ['development', 'staging', 'production']
        },
        'blockchain-address-validation': {
            description: 'Validate blockchain address formats',
            severity: 'warning',
            pattern: '(?<!\\s*//\\s*)(?<!\\s*\\*\\s*)(0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|[a-z0-9]{32,44})',
            message: 'Blockchain addresses should be validated before use',
            environments: ['development', 'staging', 'production']
        },
        'required-error-handling': {
            description: 'Ensure proper error handling in API calls and transactions',
            severity: 'error',
            pattern: '(?<!\\s*//\\s*)(?<!\\s*\\*\\s*)(?<!\\w)(fetch\\(|axios\\.|ethers\\.|web3\\.|contract\\.)',
            message: 'API and blockchain calls must include try-catch blocks and proper error handling',
            environments: ['development', 'staging', 'production']
        },
        'transaction-safety': {
            description: 'Ensure transaction validation',
            severity: 'error',
            pattern: '(?<!\\s*//\\s*)(?<!\\s*\\*\\s*)(?<!\\w)(transfer|send|withdraw|swap|trade|execute)(?=\\s*\\()',
            message: 'Financial transactions must include amount validation, address validation, and security checks',
            environments: ['development', 'staging', 'production']
        },
        'rate-limiting': {
            description: 'Ensure API rate limiting',
            severity: 'warning',
            pattern: '(app/api/.*route\\.ts|app/api/.*/\\[.*\\]/route\\.ts|pages/api/.*\\.ts)',
            message: 'API routes should implement rate limiting for security',
            environments: ['staging', 'production']
        },
        'input-validation': {
            description: 'Ensure proper input validation',
            severity: 'error',
            pattern: '(?<!\\s*//\\s*)(?<!\\s*\\*\\s*)(req\\.(body|query|params)|userinput|formdata|e\\.target\\.value)',
            message: 'All user inputs must be validated and sanitized',
            environments: ['development', 'staging', 'production']
        },
        'secure-headers': {
            description: 'Ensure security headers are set',
            severity: 'warning',
            pattern: '(app/api/.*route\\.ts|pages/api/.*\\.ts)',
            message: 'API routes should set appropriate security headers',
            environments: ['staging', 'production']
        }
    },
    
    // File classifications from .cursorrules
    classifications: {
        core: {
            description: 'Core application logic and infrastructure',
            files: ['lib/utils/**', 'app/api/**']
        },
        blockchain: {
            description: 'Blockchain connectivity and smart contract interactions',
            files: ['lib/chains/**', 'app/api/**/[chain]/**']
        },
        exchanges: {
            description: 'Centralized and decentralized exchange integrations',
            files: ['lib/exchanges/**', 'lib/cex/**', 'app/api/exchanges/**']
        },
        ui: {
            description: 'Frontend components and UI logic',
            files: ['app/components/**', 'app/page.tsx', 'app/layout.tsx', 'app/globals.css', 'public/**']
        },
        data: {
            description: 'Data models, storage, and state management',
            files: ['lib/data/**', 'app/context/**', 'app/store/**']
        },
        tests: {
            description: 'Test files, documentation, and project information',
            files: ['**/*.test.{js,ts,jsx,tsx}', '**/*.spec.{js,ts,jsx,tsx}', 'docs/**', '*.md']
        },
        config: {
            description: 'Configuration and environment files',
            files: ['*.config.{js,ts}', '*.json', '*.yml', '.env.example', 'components.json']
        }
    },
    
    // File patterns
    includes: [
        '**/*.{js,ts,jsx,tsx}',
        '**/*.json',
        '**/*.yml',
        '**/*.css',
        '**/*.md',
        '**/*.env.example'
    ],
    excludes: [
        '**/node_modules/**',
        '**/.next/**',
        '**/build/**',
        '**/dist/**',
        '**/.env*',
        '**/coverage/**',
        '**/*.log'
    ]
} 