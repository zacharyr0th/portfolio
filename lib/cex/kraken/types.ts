export interface KrakenBalance {
    [key: string]: string // Currency code -> Balance amount
}

export interface KrakenApiResponse<T> {
    error: string[]
    result?: T
}
