// Cache NumberFormat instances for better performance
const numberFormatCache = new Map<string, Intl.NumberFormat>()
const dateFormatCache = new Map<string, Intl.DateTimeFormat>()

function getNumberFormat(options: Intl.NumberFormatOptions): Intl.NumberFormat {
    const key = JSON.stringify(options)
    let formatter = numberFormatCache.get(key)
    if (!formatter) {
        formatter = new Intl.NumberFormat('en-US', options)
        numberFormatCache.set(key, formatter)
    }
    return formatter
}

function getDateFormat(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
    const key = JSON.stringify(options)
    let formatter = dateFormatCache.get(key)
    if (!formatter) {
        formatter = new Intl.DateTimeFormat('en-US', options)
        dateFormatCache.set(key, formatter)
    }
    return formatter
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

export function formatDate(input: string | number | Date): string {
    const date = input instanceof Date ? input : new Date(input)
    const options: Intl.DateTimeFormatOptions = {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    }

    return getDateFormat(options).format(date)
}

export type Period = '1D' | '1W' | '1M' | '3M' | '1Y' | 'YTD'
export type TimePeriodData = Array<{ date: string; value: number }>

const periodFormatOptions: Record<Period, Intl.DateTimeFormatOptions> = {
    '1D': { hour: 'numeric', minute: '2-digit' },
    '1W': { weekday: 'short' },
    '1M': { month: 'short', day: 'numeric' },
    '3M': { month: 'short', day: 'numeric' },
    '1Y': { month: 'short', year: '2-digit' },
    YTD: { month: 'short', year: '2-digit' },
} as const

export function formatDateByPeriod(date: string, period: Period): string {
    const d = new Date(date)
    const options = periodFormatOptions[period]
    return getDateFormat(options).format(d)
}

export function filterDataByPeriod(data: TimePeriodData, period: Period): TimePeriodData {
    const now = new Date()
    const startDate = new Date()

    switch (period) {
        case '1D':
            startDate.setDate(now.getDate() - 1)
            break
        case '1W':
            startDate.setDate(now.getDate() - 7)
            break
        case '1M':
            startDate.setMonth(now.getMonth() - 1)
            break
        case '3M':
            startDate.setMonth(now.getMonth() - 3)
            break
        case '1Y':
            startDate.setFullYear(now.getFullYear() - 1)
            break
        case 'YTD':
            startDate.setMonth(0, 1) // January 1st of current year
            break
        default:
            return data
    }

    const startTimestamp = startDate.getTime()
    return data.filter(item => new Date(item.date).getTime() >= startTimestamp)
} 