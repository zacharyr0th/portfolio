import { ethers } from 'ethers';
import { ChainHandler, ChainTokenBalance, ChainTokenPrice } from '../types';
import { BaseChainHandler, BaseHandlerConfig } from '../baseHandler';
import { EVM_CHAINS } from './types';
import { TokenBalance } from './TokenBalance';
import { logger } from '@/lib/utils/core/logger';

// Standard ERC20 ABI for token balance checks
const ERC20_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function name() view returns (string)'
];

// Common ERC20 token addresses per chain
const COMMON_TOKENS: Record<number, string[]> = {
    1: [ // Ethereum
        '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
        '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
        '0x514910771af9ca656af840dff83e8264ecf986ca', // LINK
    ],
    137: [ // Polygon
        '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // USDT
        '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC
        '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6', // WBTC
        '0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39', // LINK
    ],
    // Add more chains as needed
};

// Create EVM handler instance
const evmHandlerInstance = new BaseChainHandler({
    chainName: 'evm',
    fetchBalancesImpl: async (publicKey: string, accountId: string) => {
        // Normalize chain name by removing -main suffix and handling eth alias
        const chainName = accountId?.split('-')?.[0]?.replace('eth', 'ethereum') || 'ethereum'
        const chainConfig = EVM_CHAINS[chainName as keyof typeof EVM_CHAINS]
        
        if (!chainConfig) {
            logger.warn(`Unsupported EVM chain: ${accountId} (normalized: ${chainName})`)
            return { balances: [] }
        }

        try {
            // Fetch balances from SimpleHash API
            const response = await fetch(`/api/evm/balance?address=${publicKey}&chain=${chainName}`)
            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`SimpleHash API error: ${response.status} - ${errorText}`)
            }

            const data = await response.json()
            return {
                balances: data.balances,
                prices: data.prices
            }
        } catch (error) {
            logger.error('Error fetching balances', error instanceof Error ? error : new Error(String(error)), {
                chain: chainConfig?.name || chainName,
                publicKey
            })
            throw error instanceof Error ? error : new Error(String(error))
        }
    },
    fetchPricesImpl: async () => {
        // Prices are now included in the balance response
        return {}
    },
    getExplorerUrlImpl: (publicKey: string, accountId: string) => {
        const chainName = accountId?.split('-')?.[0]?.replace('eth', 'ethereum') || 'ethereum';
        const chainConfig = EVM_CHAINS[chainName as keyof typeof EVM_CHAINS];
        if (!chainConfig) throw new Error(`Unsupported chain: ${chainName}`);
        return `${chainConfig.explorerUrl}/address/${publicKey}`;
    },
    BalanceDisplayComponent: TokenBalance,
});

// Export the handler interface
export const evmHandler: ChainHandler = evmHandlerInstance;

// Export cleanup function for tests and hot reloading
export const clearCache = () => evmHandlerInstance.clearCache(); 