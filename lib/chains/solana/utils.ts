// Cache NumberFormat instances for better performance
const numberFormatCache = new Map<string, Intl.NumberFormat>()

function getNumberFormat(options: Intl.NumberFormatOptions): Intl.NumberFormat {
    const key = JSON.stringify(options)
    let formatter = numberFormatCache.get(key)
    if (!formatter) {
        formatter = new Intl.NumberFormat('en-US', options)
        numberFormatCache.set(key, formatter)
    }
    return formatter
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    const defaultOptions: Intl.NumberFormatOptions = {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
    }
    return getNumberFormat(options ?? defaultOptions).format(value)
}

export function formatCurrency(value: number, compact: boolean = false): string {
    const options: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        notation: compact && Math.abs(value) >= 1000 ? 'compact' : 'standard',
        compactDisplay: 'short',
    }

    return getNumberFormat(options).format(value)
} 