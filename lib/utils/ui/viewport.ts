import type { Viewport } from 'next'

/**
 * Default viewport configuration for the application
 * - Prevents zooming on mobile devices
 * - Ensures consistent rendering across devices
 * - Optimizes for mobile-first design
 */
export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    minimumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
} as const
