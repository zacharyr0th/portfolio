export interface GeminiBalance {
    type: string
    currency: string
    amount: string
    available: string
    availableForWithdrawal: string
}

export interface GeminiApiResponse<T> {
    result?: T
    message?: string
}
