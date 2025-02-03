'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useIsClient } from './use-is-client'
import { logger } from '@/lib/utils/core/logger'

// Cache for media query instances and their reference counts
const mediaQueryCache = new Map<string, MediaQueryList>()
const mediaQueryRefCounts = new Map<string, number>()

export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false)
    const isClient = useIsClient()

    const handleChange = useCallback((event: MediaQueryListEvent | MediaQueryList) => {
        setMatches(event.matches)
    }, [])

    // Memoize the media query string to prevent unnecessary re-creation
    const mediaQueryString = useMemo(() => query, [query])

    useEffect(() => {
        if (!isClient) return undefined

        let mediaQuery: MediaQueryList | undefined

        try {
            // Try to get from cache first
            mediaQuery = mediaQueryCache.get(mediaQueryString)

            if (!mediaQuery) {
                mediaQuery = window.matchMedia(mediaQueryString)
                mediaQueryCache.set(mediaQueryString, mediaQuery)
                mediaQueryRefCounts.set(mediaQueryString, 0)
            }

            // Increment reference count
            mediaQueryRefCounts.set(
                mediaQueryString,
                (mediaQueryRefCounts.get(mediaQueryString) || 0) + 1
            )

            handleChange(mediaQuery)
            mediaQuery.addEventListener('change', handleChange)

            return () => {
                if (mediaQuery) {
                    mediaQuery.removeEventListener('change', handleChange)
                    
                    // Decrement reference count and cleanup if no more references
                    const refCount = mediaQueryRefCounts.get(mediaQueryString) || 0
                    if (refCount <= 1) {
                        mediaQueryCache.delete(mediaQueryString)
                        mediaQueryRefCounts.delete(mediaQueryString)
                    } else {
                        mediaQueryRefCounts.set(mediaQueryString, refCount - 1)
                    }
                }
            }
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e))
            logger.error('Error setting up media query:', error)
            setMatches(false)
            return undefined
        }
    }, [mediaQueryString, handleChange, isClient])

    // Return false during SSR
    if (!isClient) return false

    return matches
}
