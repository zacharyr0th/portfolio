'use client'

import { useEffect, useCallback, memo } from 'react'
import { Button } from '@/app/components/ui/button'
import { Alert, AlertTitle } from '@/app/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { logger } from '@/lib/utils/core/logger'

interface GlobalErrorProps {
    error: Error & { digest?: string }
    reset: () => void
}

const GlobalError = memo(({ error, reset }: GlobalErrorProps) => {
    useEffect(() => {
        // Log the error to an error reporting service
        logger.error(
            'Global error:',
            error instanceof Error ? error : new Error(String(error)),
            {
                errorInfo: {
                    message: error.message,
                    stack: error.stack,
                    digest: error.digest,
                },
            }
        )
    }, [error])

    const handleReset = useCallback(() => {
        try {
            reset()
        } catch (e) {
            logger.error('Failed to reset:', e instanceof Error ? e : new Error(String(e)))
            // Fallback to page refresh if reset fails
            window.location.reload()
        }
    }, [reset])

    return (
        <html lang="en">
            <body>
                <div className="min-h-screen flex items-center justify-center p-4 touch-manipulation">
                    <div className="max-w-md w-full mx-4 space-y-4">
                        <Alert variant="destructive" className="shadow-lg">
                            <AlertCircle className="h-4 w-4" aria-hidden="true" />
                            <AlertTitle className="text-base sm:text-lg font-semibold">
                                Something went wrong!
                            </AlertTitle>
                            <div className="mt-2 text-sm sm:text-base">
                                {error.message || 'An unexpected error occurred'}
                            </div>
                        </Alert>
                        <div className="flex justify-center">
                            <Button
                                onClick={handleReset}
                                variant="outline"
                                className="w-full sm:w-auto h-12 sm:h-10 text-base sm:text-sm"
                                type="button"
                            >
                                Try again
                            </Button>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    )
})

GlobalError.displayName = 'GlobalError'
export default GlobalError
