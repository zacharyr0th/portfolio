import { NextResponse } from 'next/server';
import { evmHandler } from '@/lib/chains/evm';
import { isAddress } from 'ethers';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { address, chainId = 1 } = body;

        if (!address || !isAddress(address)) {
            return NextResponse.json(
                { error: 'Invalid address' },
                { status: 400 }
            );
        }

        const balances = await evmHandler.fetchBalances(address, chainId);
        return NextResponse.json({ balances });
    } catch (error) {
        console.error('Error in EVM API route:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 