import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { ethers } from 'ethers';

const SUPPORTED_CHAINS = {
  ethereum: {
    rpc: process.env.ETH_RPC_URL || 'https://eth.llamarpc.com',
    explorer: 'https://etherscan.io',
    nativeCurrency: 'ETH'
  },
  polygon: {
    rpc: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com',
    nativeCurrency: 'MATIC'
  },
  // Add more chains as needed
};

export async function POST(request: Request) {
  try {
    const { address, chain = 'ethereum' } = await request.json();
    
    if (!address || !SUPPORTED_CHAINS[chain]) {
      return NextResponse.json(
        { error: 'Invalid address or unsupported chain' },
        { status: 400 }
      );
    }

    // Initialize provider
    const provider = new ethers.JsonRpcProvider(SUPPORTED_CHAINS[chain].rpc);

    // Get native token balance
    const balance = await provider.getBalance(address);
    const formattedBalance = ethers.formatEther(balance);

    // Store wallet info
    const walletId = `wallet:${chain}:${address}`;
    await kv.set(walletId, {
      address,
      chain,
      lastUpdated: new Date().toISOString()
    });

    // Get basic token balances (you might want to expand this with a token list)
    // For now, just return the native balance
    return NextResponse.json({
      walletId,
      address,
      chain,
      balance: {
        [SUPPORTED_CHAINS[chain].nativeCurrency]: formattedBalance
      },
      explorer: `${SUPPORTED_CHAINS[chain].explorer}/address/${address}`
    });
  } catch (error) {
    console.error('Error connecting wallet:', error);
    return NextResponse.json(
      { error: 'Failed to connect wallet' },
      { status: 500 }
    );
  }
} 