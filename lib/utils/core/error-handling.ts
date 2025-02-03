export type ErrorCode = string
export type ErrorDetails = unknown
export type ErrorTransform = (error: unknown) => AppError

export class AppError extends Error {
    constructor(
        message: string,
        public readonly code: ErrorCode,
        public readonly statusCode: number = 500,
        public readonly details?: ErrorDetails
    ) {
        super(message)
        this.name = 'AppError'

        // Ensure proper prototype chain for instanceof checks
        Object.setPrototypeOf(this, AppError.prototype)
    }

    static isAppError(error: unknown): error is AppError {
        return error instanceof AppError
    }

    toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            statusCode: this.statusCode,
            details: this.details,
        }
    }
}

export function handleApiError(error: unknown): AppError {
    if (AppError.isAppError(error)) {
        return error
    }

    if (error instanceof Error) {
        return new AppError(error.message, 'UNKNOWN_ERROR', 500, {
            originalError: {
                name: error.name,
                message: error.message,
                stack: error.stack,
            },
        })
    }

    return new AppError('An unexpected error occurred', 'UNKNOWN_ERROR', 500, {
        originalError: error,
    })
}

export function createErrorMessage(error: unknown): string {
    if (AppError.isAppError(error)) {
        return error.message
    }

    if (error instanceof Error) {
        return error.message
    }

    return 'An unexpected error occurred'
}

export async function withErrorHandling<T>(
    fn: () => Promise<T>,
    errorTransform?: ErrorTransform
): Promise<T> {
    try {
        return await fn()
    } catch (error) {
        throw errorTransform ? errorTransform(error) : handleApiError(error)
    }
}
