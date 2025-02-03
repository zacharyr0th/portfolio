'use client'

import { useEffect, useState } from 'react'

// Shared state to track client-side rendering across all hook instances
let isClientSide = false

export function useIsClient() {
    const [isClient, setIsClient] = useState(isClientSide)

    useEffect(() => {
        // Only update if we haven't already detected client-side
        if (!isClientSide) {
            isClientSide = true
            setIsClient(true)
        }
    }, [])

    return isClient
}
