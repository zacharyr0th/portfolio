import { useState, useEffect, useCallback, useRef } from 'react'
import { logger } from '@/lib/utils/core/logger'

// Prefix all keys to avoid collisions
const KEY_PREFIX = 'zachtos_'
const MAX_STORAGE_SIZE = 5 * 1024 * 1024 // 5MB limit

// Sanitize the storage key to prevent injection
function sanitizeKey(key: string): string {
    return `${KEY_PREFIX}${key}`.replace(/[^a-zA-Z0-9_-]/g, '_')
}

// Check if we're over storage quota
function isStorageQuotaExceeded(): boolean {
    let totalSize = 0
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key) {
                const value = localStorage.getItem(key)
                if (value) {
                    totalSize += value.length * 2 // UTF-16 characters are 2 bytes each
                }
            }
        }
        return totalSize > MAX_STORAGE_SIZE
    } catch {
        return false
    }
}

// Clean up old items if we're over quota
function cleanupStorage(): void {
    try {
        const keys = Object.keys(localStorage)
            .filter(key => key.startsWith(KEY_PREFIX))
            .sort((a, b) => {
                const aTime = localStorage.getItem(`${a}_timestamp`)
                const bTime = localStorage.getItem(`${b}_timestamp`)
                return (aTime ? parseInt(aTime) : 0) - (bTime ? parseInt(bTime) : 0)
            })

        while (isStorageQuotaExceeded() && keys.length) {
            const oldestKey = keys.shift()
            if (oldestKey) {
                localStorage.removeItem(oldestKey)
                localStorage.removeItem(`${oldestKey}_timestamp`)
            }
        }
    } catch (error) {
        logger.warn('Error cleaning up localStorage:', { error: error instanceof Error ? error.message : String(error) })
    }
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
    const safeKey = sanitizeKey(key)
    const initialValueRef = useRef(initialValue)

    // Get from local storage then parse stored json or return initialValue
    const readValue = useCallback((): T => {
        if (typeof window === 'undefined') {
            return initialValueRef.current
        }

        try {
            const item = localStorage.getItem(safeKey)
            if (!item) return initialValueRef.current

            // Validate stored timestamp
            const timestamp = localStorage.getItem(`${safeKey}_timestamp`)
            if (!timestamp || Date.now() - parseInt(timestamp) > 30 * 24 * 60 * 60 * 1000) {
                // Data is older than 30 days, clear it
                localStorage.removeItem(safeKey)
                localStorage.removeItem(`${safeKey}_timestamp`)
                return initialValueRef.current
            }

            // Validate data structure
            const parsed = JSON.parse(item)
            if (typeof parsed !== typeof initialValueRef.current) {
                throw new Error('Invalid stored data type')
            }

            return parsed as T
        } catch (error) {
            logger.warn(`Error reading localStorage key "${safeKey}":`, { error: error instanceof Error ? error.message : String(error) })
            // Clear invalid data
            localStorage.removeItem(safeKey)
            localStorage.removeItem(`${safeKey}_timestamp`)
            return initialValueRef.current
        }
    }, [safeKey])

    // Initialize state with value from localStorage or initial value
    const [storedValue, setStoredValue] = useState<T>(() => readValue())

    const setValue = useCallback(
        (value: T | ((prev: T) => T)) => {
            try {
                if (isStorageQuotaExceeded()) {
                    cleanupStorage()
                }

                // Calculate new value outside of setState to avoid unnecessary re-renders
                const newValue = value instanceof Function ? value(storedValue) : value
                const valueString = JSON.stringify(newValue)

                // Check size before storing
                if (valueString.length * 2 > MAX_STORAGE_SIZE) {
                    throw new Error('Value exceeds maximum storage size')
                }

                // Only update state and localStorage if value has changed
                if (JSON.stringify(storedValue) !== valueString) {
                    setStoredValue(newValue)
                    if (typeof window !== 'undefined') {
                        localStorage.setItem(safeKey, valueString)
                        localStorage.setItem(`${safeKey}_timestamp`, Date.now().toString())
                    }
                }
            } catch (error) {
                logger.warn(`Error setting localStorage key "${safeKey}":`, { error: error instanceof Error ? error.message : String(error) })
            }
        },
        [safeKey, storedValue]
    )

    // Sync state if storage changes in another window
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === safeKey && e.newValue !== null) {
                try {
                    const newValue = JSON.parse(e.newValue)
                    // Only update if value has actually changed
                    if (JSON.stringify(storedValue) !== e.newValue) {
                        setStoredValue(newValue)
                    }
                } catch (error) {
                    logger.warn(`Error handling storage change for "${safeKey}":`, { error: error instanceof Error ? error.message : String(error) })
                }
            }
        }

        window.addEventListener('storage', handleStorageChange)
        return () => window.removeEventListener('storage', handleStorageChange)
    }, [safeKey, storedValue])

    return [storedValue, setValue]
} 