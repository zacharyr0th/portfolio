'use client'

import { ErrorBoundary } from '@/app/components/ui/error-boundary'
import { logger } from '@/lib/utils/core/logger'
import { Providers } from './providers'
import { Alert, AlertTitle } from '@/app/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { memo } from 'react'

interface RootLayoutClientProps {
    children: React.ReactNode
}

const ErrorAlert = memo(({ message }: { message: string }) => (
    <div className="flex min-h-screen items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Application Error</AlertTitle>
            <p className="mt-2 text-sm">{message}</p>
        </Alert>
    </div>
))
ErrorAlert.displayName = 'ErrorAlert'

export function RootLayoutClient({ children }: RootLayoutClientProps) {
    return (
        <ErrorBoundary
            onError={(error: Error) => {
                logger.error('Root layout error:', error)
            }}
        >
            <div className="flex min-h-screen flex-col bg-background text-foreground">
                <Providers>{children}</Providers>
            </div>
        </ErrorBoundary>
    )
} 