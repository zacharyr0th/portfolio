import { NextResponse } from 'next/server';
import { evmHandler } from '@/lib/chains/evm';
import { validateAddress } from '@/lib/utils/validation';
import { rateLimit } from '@/lib/utils/rateLimit';

export async function POST(req: Request) {
    try {
        // Rate limiting
        const rateLimitResult = await rateLimit(req);
        if (!rateLimitResult.success) {
            return new NextResponse(JSON.stringify({ error: 'Rate limit exceeded' }), {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'X-RateLimit-Limit': rateLimitResult.limit.toString(),
                    'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                    'X-RateLimit-Reset': rateLimitResult.reset.toString(),
                },
            });
        }

        const body = await req.json();
        const { address, chainId = 1 } = body;

        // Validate address
        if (!address || !validateAddress(address)) {
            return new NextResponse(JSON.stringify({ error: 'Invalid address' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Fetch balances and prices
        const [balances, prices] = await Promise.all([
            evmHandler.fetchBalances(address, chainId),
            evmHandler.fetchPrices(chainId),
        ]);

        return new NextResponse(JSON.stringify({ balances, prices }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error in EVM API route:', error);
        return new NextResponse(
            JSON.stringify({ error: 'Internal server error' }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
} 