import { NextResponse } from 'next/server'
import { getJupiterPrices } from '@/lib/utils/prices/jupiter'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const tokens = searchParams.get('tokens')

        if (!tokens) {
            return NextResponse.json(
                { error: 'Missing tokens parameter' },
                { status: 400 }
            )
        }

        const tokenAddresses = tokens.split(',')
        const prices = await getJupiterPrices(tokenAddresses)

        return NextResponse.json({ prices }, {
            headers: {
                'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=59',
            },
        })
    } catch (error) {
        console.error('Price API error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch prices' },
            { status: 500 }
        )
    }
} 