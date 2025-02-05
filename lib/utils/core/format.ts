// Types
export type Period = '1D' | '1W' | '1M' | '3M' | '1Y' | 'YTD'
export type TimePeriodData = Array<{ date: string; value: number }>

// Cache configurations
const CACHE_SIZE_LIMIT = 100

// Optimized caching using LRU-like pattern
class FormatterCache<T> {
    private cache = new Map<string, T>()
    
    get(key: string): T | undefined {
        const value = this.cache.get(key)
        if (value) {
            // Move to front (most recently used)
            this.cache.delete(key)
            this.cache.set(key, value)
        }
        return value
    }

    set(key: string, value: T): void {
        if (this.cache.size >= CACHE_SIZE_LIMIT) {
            // Remove oldest entry if cache is full
            const firstKey = Array.from(this.cache.keys())[0]
            if (firstKey) {
                this.cache.delete(firstKey)
            }
        }
        this.cache.set(key, value)
    }
}

const numberFormatCache = new FormatterCache<Intl.NumberFormat>()
const dateFormatCache = new FormatterCache<Intl.DateTimeFormat>()

// Optimized formatter getters
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

// Optimized currency formatting with predefined options
const currencyFormatOptions = {
    compact: {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        compactDisplay: 'short',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
    },
    standard: {
        style: 'currency',
        currency: 'USD',
    },
} as const

export function formatCurrency(value: number, showDecimals: boolean = true): string {
    if (value === 0) return '$0'

    const absValue = Math.abs(value)
    let options: Intl.NumberFormatOptions

    if (absValue >= 1000) {
        options = currencyFormatOptions.compact
    } else {
        options = { ...currencyFormatOptions.standard }
        
        if (!showDecimals || absValue >= 100) {
            options.minimumFractionDigits = 0
            options.maximumFractionDigits = 0
        } else if (absValue < 0.01) {
            options.minimumFractionDigits = 4
            options.maximumFractionDigits = 4
        } else if (absValue < 1) {
            options.minimumFractionDigits = 3
            options.maximumFractionDigits = 3
        } else {
            options.minimumFractionDigits = 2
            options.maximumFractionDigits = 2
        }
    }

    return getNumberFormat(options).format(value)
}

// Predefined date format options
const defaultDateOptions: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
} as const

export function formatDate(input: string | number | Date): string {
    const date = input instanceof Date ? input : new Date(input)
    return getDateFormat(defaultDateOptions).format(date)
}

// Optimized period formatting with constant options
const periodFormatOptions: Readonly<Record<Period, Intl.DateTimeFormatOptions>> = {
    '1D': { hour: 'numeric', minute: '2-digit' },
    '1W': { weekday: 'short' },
    '1M': { month: 'short', day: 'numeric' },
    '3M': { month: 'short', day: 'numeric' },
    '1Y': { month: 'short', year: '2-digit' },
    YTD: { month: 'short', year: '2-digit' },
} as const

export function formatDateByPeriod(date: string, period: Period): string {
    return getDateFormat(periodFormatOptions[period]).format(new Date(date))
}

// Optimized period filtering with date calculations
const MILLISECONDS_PER_DAY = 86400000

export function filterDataByPeriod(data: TimePeriodData, period: Period): TimePeriodData {
    const now = new Date()
    const startDate = new Date(now)
    
    // Optimize date calculations
    switch (period) {
        case '1D':
            startDate.setTime(now.getTime() - MILLISECONDS_PER_DAY)
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
            startDate.setMonth(0, 1)
            break
        default:
            return data
    }

    const startTimestamp = startDate.getTime()
    return data.filter(item => new Date(item.date).getTime() >= startTimestamp)
}

// Optimized relative time formatting with constants
const TIME_UNITS = {
    SECOND: 1000,
    MINUTE: 60000,
    HOUR: 3600000,
    DAY: 86400000,
} as const

export function formatRelativeTime(timestamp: number): string {
    const diff = Date.now() - timestamp
    
    if (diff >= TIME_UNITS.DAY) {
        return `${Math.floor(diff / TIME_UNITS.DAY)}d ago`
    }
    if (diff >= TIME_UNITS.HOUR) {
        return `${Math.floor(diff / TIME_UNITS.HOUR)}h ago`
    }
    if (diff >= TIME_UNITS.MINUTE) {
        return `${Math.floor(diff / TIME_UNITS.MINUTE)}m ago`
    }
    if (diff >= TIME_UNITS.SECOND * 10) {
        return `${Math.floor(diff / TIME_UNITS.SECOND)}s ago`
    }
    return 'just now'
} 