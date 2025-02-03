'use client'

import React, { ErrorInfo } from 'react'
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary'
import { Button } from './button'
import { Alert, AlertTitle } from './alert'
import { AlertCircle } from 'lucide-react'

interface FallbackProps {
    error: Error
    resetErrorBoundary: () => void
}

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
    return (
        <div className="p-4 w-full">
            <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Something went wrong</AlertTitle>
                <div className="mt-2 text-sm">
                    {error.message || 'An unexpected error occurred'}
                </div>
            </Alert>
            <Button onClick={resetErrorBoundary} variant="outline" size="sm">
                Try again
            </Button>
        </div>
    )
}

interface ErrorBoundaryProps {
    children: React.ReactNode
    onReset?: () => void
    onError?: (error: Error, info: ErrorInfo) => void
}

export function ErrorBoundary({ children, onReset, onError }: ErrorBoundaryProps) {
    return (
        <ReactErrorBoundary FallbackComponent={ErrorFallback} onReset={onReset} onError={onError}>
            {children}
        </ReactErrorBoundary>
    )
}
