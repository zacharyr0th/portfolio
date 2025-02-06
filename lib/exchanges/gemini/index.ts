import crypto from 'crypto'
import { logger } from '@/lib/utils/core/logger'
import { GeminiBalance, GeminiConfig } from './types'

export class GeminiHandler {
    private readonly apiKey: string
    private readonly apiSecret: string
    private readonly baseUrl: string
    private readonly accountName: string

    constructor(config: GeminiConfig) {
        this.apiKey = config.apiKey
        this.apiSecret = config.apiSecret
        this.baseUrl = 'https://api.gemini.com/v1'
        this.accountName = config.accountName || 'primary'
    }

    private generateHeaders(endpoint: string, payload: any = {}): Record<string, string> {
        const nonce = Date.now()
        const encodedPayload = Buffer.from(JSON.stringify({ request: endpoint, nonce, ...payload })).toString('base64')
        
        const signature = crypto
            .createHmac('sha384', this.apiSecret)
            .update(encodedPayload)
            .digest('hex')

        return {
            'Content-Type': 'text/plain',
            'Content-Length': '0',
            'X-GEMINI-APIKEY': this.apiKey,
            'X-GEMINI-PAYLOAD': encodedPayload,
            'X-GEMINI-SIGNATURE': signature,
            'Cache-Control': 'no-cache'
        }
    }

    private async makeRequest<T>(endpoint: string, payload: any = {}): Promise<T> {
        try {
            const headers = this.generateHeaders(endpoint, payload)
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(`Gemini API error: ${error.message || response.statusText}`)
            }

            return response.json()
        } catch (error) {
            logger.error('Gemini API request failed:', error)
            throw error
        }
    }

    async getBalances(): Promise<GeminiBalance[]> {
        try {
            const balances = await this.makeRequest<GeminiBalance[]>('/balances')
            return balances.filter(balance => parseFloat(balance.amount) > 0)
        } catch (error) {
            logger.error('Failed to fetch Gemini balances:', error)
            throw error
        }
    }

    async getTotalBalance(): Promise<number> {
        try {
            const balances = await this.getBalances()
            let total = 0

            for (const balance of balances) {
                const tickerResponse = await fetch(`${this.baseUrl}/pubticker/${balance.currency}USD`)
                if (tickerResponse.ok) {
                    const ticker = await tickerResponse.json()
                    const price = parseFloat(ticker.last)
                    total += parseFloat(balance.amount) * price
                }
            }

            return total
        } catch (error) {
            logger.error('Failed to calculate total Gemini balance:', error)
            throw error
        }
    }
} 