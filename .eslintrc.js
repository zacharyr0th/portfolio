// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path')

module.exports = {
    extends: ['next/core-web-vitals', 'plugin:@typescript-eslint/recommended', 'prettier'],
    plugins: ['@typescript-eslint', 'prettier'],
    rules: {
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
        'prefer-const': 'warn',
        'eqeqeq': ['error', 'always'],
        'prettier/prettier': ['error', {
            semi: false,
            singleQuote: true,
            tabWidth: 4,
            printWidth: 120,
            endOfLine: 'auto'
        }]
    },
    settings: {
        react: {
            version: 'detect'
        },
        'import/resolver': {
            typescript: {
                project: path.resolve(__dirname, './tsconfig.json')
            }
        }
    },
    ignorePatterns: [
        'node_modules/',
        '.next/',
        'out/',
        'public/',
        'build/',
        'dist/',
        'coverage/'
    ],
    overrides: [
        {
            files: ['**/*.ts', '**/*.tsx'],
            rules: {
                '@typescript-eslint/explicit-function-return-type': ['warn', {
                    allowExpressions: true,
                    allowTypedFunctionExpressions: true
                }],
                '@typescript-eslint/no-unused-vars': ['warn', {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_'
                }]
            }
        }
    ]
} 