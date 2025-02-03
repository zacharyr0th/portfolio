// Re-export UI utilities
export * from './ui'

// Re-export error handling utilities
export {
    AppError,
    handleApiError,
    createErrorMessage,
    withErrorHandling,
} from './core/error-handling'

// Re-export performance monitoring utilities
export {
    performanceMonitor,
    createCache,
    withPerformanceTracking,
    debounce,
    throttle,
    measurePerformance,
    trackMethodPerformance,
} from './core/performance'

// Re-export logger
export { logger, withErrorLogging, createContextLogger } from './core/logger'

// Export UI utilities
export { viewport } from './ui/viewport'
export { default as ErrorPage } from './ui/error'
export { default as NotFoundPage } from './ui/not-found'
export { useMediaQuery } from './hooks/useMediaQuery'
