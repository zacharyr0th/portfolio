interface JupiterPriceResponse {
    data: {
        [key: string]: {
            id: string
            mintSymbol: string
            vsToken: string
            vsTokenSymbol: string
            price: number
        }
    }
}

const USDC_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

export async function getJupiterPrices(tokenAddresses: string[]) {
    try {
        // Filter out USDC as it's the base price
        const filteredAddresses = tokenAddresses.filter(addr => addr !== USDC_ADDRESS)
        
        if (filteredAddresses.length === 0) {
            return { [USDC_ADDRESS]: 1 } // USDC price is always 1
        }

        const queryString = filteredAddresses.map(addr => `ids=${addr}`).join('&')
        const response = await fetch(
            `https://price.jup.ag/v4/price?${queryString}&vsToken=${USDC_ADDRESS}`,
            {
                headers: {
                    'Accept': 'application/json',
                },
            }
        )

        if (!response.ok) {
            throw new Error(`Jupiter API error: ${response.statusText}`)
        }

        const data: JupiterPriceResponse = await response.json()
        
        // Format the response into a simple address -> price mapping
        const prices = {
            [USDC_ADDRESS]: 1, // Always include USDC base price
            ...Object.entries(data.data).reduce((acc, [address, details]) => ({
                ...acc,
                [address]: details.price
            }), {})
        }

        return prices
    } catch (error) {
        console.error('Error fetching Jupiter prices:', error)
        throw error
    }
} 