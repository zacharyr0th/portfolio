import { useEffect, useState, useCallback } from 'react'

/**
 * A hook that returns a debounced version of the provided value.
 * The debounced value will only update after the specified delay has passed
 * without any new updates to the original value.
 *
 * @param value The value to debounce
 * @param delay The delay in milliseconds before updating the debounced value
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)

    const debouncedSetValue = useCallback(() => {
        setDebouncedValue(value)
    }, [value])

    useEffect(() => {
        // Set up the timeout to update the debounced value
        const timer = setTimeout(debouncedSetValue, delay)

        // Clean up the timeout if the value changes before the delay has passed
        return () => {
            clearTimeout(timer)
        }
    }, [delay, debouncedSetValue])

    return debouncedValue
} 