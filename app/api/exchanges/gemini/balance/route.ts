import { NextResponse } from 'next/server'
import { GeminiHandler } from '@/lib/exchanges/gemini'
import { logger } from '@/lib/utils/core/logger'

export async function GET() {
    try {
        const apiKey = process.env.GEMINI_API_KEY
        const apiSecret = process.env.GEMINI_API_SECRET

        if (!apiKey || !apiSecret) {
            return NextResponse.json(
                { error: 'Gemini API credentials not configured' },
                { status: 500 }
            )
        }

        const handler = new GeminiHandler({
            apiKey,
            apiSecret
        })

        const balance = await handler.getTotalBalance()
        
        return NextResponse.json({ balance })
    } catch (error) {
        logger.error('Failed to fetch Gemini balance:', error)
        return NextResponse.json(
            { error: 'Failed to fetch Gemini balance' },
            { status: 500 }
        )
    }
}

export async function POST() {
    return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
    )
} 