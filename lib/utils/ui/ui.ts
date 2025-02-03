import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export type ColorValue = `hsl(var(--${string}))`
export type UrlPath = `/${string}`

const colorMap = {
    positive: 'hsl(var(--success))',
    negative: 'hsl(var(--destructive))',
} as const

/**
 * Combines class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs))
}

/**
 * Returns a color value based on a numeric change
 */
export function getChangeColor(value: number): ColorValue {
    return value >= 0 ? colorMap.positive : colorMap.negative
}

/**
 * Converts a relative path to an absolute URL
 * @throws Error if APP_URL is not set in production
 */
export function absoluteUrl(path: UrlPath): string {
    const baseURL = process.env.APP_URL

    if (!baseURL && process.env.NODE_ENV === 'production') {
        throw new Error('APP_URL is not set')
    }

    return `${baseURL || 'http://localhost:3000'}${path}`
}
