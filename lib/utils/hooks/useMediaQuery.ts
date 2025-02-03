import { useEffect, useState } from 'react'

/**
 * A React hook that returns true if the current viewport matches the provided media query.
 * @param query The media query to check against (e.g., '(min-width: 768px)')
 * @returns A boolean indicating whether the media query matches
 */
export const useMediaQuery = (query: string): boolean => {
    // Initialize with null to avoid hydration mismatch
    const [matches, setMatches] = useState<boolean>(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)

        // Create a MediaQueryList object
        const mediaQuery = window.matchMedia(query)

        // Initial check
        setMatches(mediaQuery.matches)

        // Create event listener function
        const handleChange = (event: MediaQueryListEvent) => {
            setMatches(event.matches)
        }

        // Add the listener
        mediaQuery.addEventListener('change', handleChange)

        // Cleanup
        return () => {
            mediaQuery.removeEventListener('change', handleChange)
        }
    }, [query])

    // Return false during SSR to avoid hydration mismatch
    if (!mounted) return false

    return matches
} 