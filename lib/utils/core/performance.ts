import { logger } from './logger'
import { AppError } from './error-handling'

// Common types
interface MetricData {
    value: any
    timestamp: number
}

type Metric = MetricData & {
    name: string
    metadata?: Record<string, unknown>
}

export interface PerformanceMetrics {
    startTime: number
    endTime: number
    duration: number
    memory?: {
        heapUsed: number
        heapTotal: number
        external: number
    }
}

export interface TimingMetrics {
    [key: string]: Readonly<PerformanceMetrics>
}

export type PerformanceCallback = (metrics: PerformanceMetrics) => void

class PerformanceMonitor {
    private static instance: PerformanceMonitor
    private readonly timings: Map<string, PerformanceMetrics>
    private readonly callbacks: Map<string, Set<PerformanceCallback>>
    private readonly metrics: Metric[] = []

    private constructor() {
        this.timings = new Map()
        this.callbacks = new Map()
    }

    static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor()
        }
        return PerformanceMonitor.instance
    }

    startTiming(key: string): void {
        const startTime = performance.now()
        this.timings.set(key, {
            startTime,
            endTime: 0,
            duration: 0,
        })
    }

    endTiming(key: string): PerformanceMetrics | null {
        const timing = this.timings.get(key)
        if (!timing) return null

        const endTime = performance.now()
        const duration = endTime - timing.startTime

        let memory: PerformanceMetrics['memory'] | undefined
        if (typeof process !== 'undefined' && typeof process.memoryUsage === 'function') {
            const { heapUsed, heapTotal, external } = process.memoryUsage()
            memory = { heapUsed, heapTotal, external }
        }

        const metrics: PerformanceMetrics = {
            ...timing,
            endTime,
            duration,
            memory,
        }

        this.timings.set(key, metrics)
        this.notifyCallbacks(key, metrics)

        return metrics
    }

    private notifyCallbacks(key: string, metrics: PerformanceMetrics): void {
        const callbacks = this.callbacks.get(key)
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(metrics)
                } catch (error) {
                    logger.error(
                        `Error in performance callback for ${key}:`,
                        error instanceof Error ? error : new Error(String(error))
                    )
                }
            })
        }
    }

    onTiming(key: string, callback: PerformanceCallback): () => void {
        let callbacks = this.callbacks.get(key)
        if (!callbacks) {
            callbacks = new Set()
            this.callbacks.set(key, callbacks)
        }
        callbacks.add(callback)

        // Return cleanup function
        return () => {
            const callbackSet = this.callbacks.get(key)
            if (callbackSet) {
                callbackSet.delete(callback)
                if (callbackSet.size === 0) {
                    this.callbacks.delete(key)
                }
            }
        }
    }

    getMetrics(key: string): Readonly<PerformanceMetrics> | null {
        const metrics = this.timings.get(key)
        return metrics ? Object.freeze({ ...metrics }) : null
    }

    getAllMetrics(): Readonly<TimingMetrics> {
        const metrics: TimingMetrics = {}
        this.timings.forEach((value, key) => {
            metrics[key] = Object.freeze({ ...value })
        })
        return Object.freeze(metrics)
    }

    clearMetrics(): void {
        this.timings.clear()
    }

    addMetric(metric: Metric): void {
        this.metrics.push(metric)
    }
}

export const performanceMonitor = PerformanceMonitor.getInstance()

// Helper function to measure function execution time
export function measurePerformance<T extends (...args: any[]) => Promise<any>>(
    key: string,
    fn: T
): T {
    return (async (...args: Parameters<T>) => {
        performanceMonitor.startTiming(key)
        try {
            const result = await fn(...args)
            performanceMonitor.endTiming(key)
            return result
        } catch (error) {
            performanceMonitor.endTiming(key)
            throw error
        }
    }) as T
}

// Helper function to create a performance-tracked version of an object's methods
export function trackMethodPerformance<T extends object>(obj: T, methodNames: (keyof T)[]): T {
    const trackedObj = { ...obj }

    methodNames.forEach(methodName => {
        const originalMethod = obj[methodName]
        if (typeof originalMethod === 'function') {
            ;(trackedObj[methodName] as any) = measurePerformance(
                `${obj.constructor.name}.${String(methodName)}`,
                originalMethod.bind(obj)
            )
        }
    })

    return trackedObj
}

// Cache implementation
interface CacheMetrics {
    key: string
    size: number
    value: any
    timestamp: number
}

class Cache<T> {
    private maxSize: number
    private currentSize: number
    private namespace: string
    private cleanupInterval: NodeJS.Timeout
    private cache: Map<string, { value: T; timestamp: number; size: number }>
    private lruList: string[]
    private metrics: CacheMetrics[] = []
    private readonly maxMetrics: number

    constructor({
        maxSize = 100 * 1024 * 1024, // 100MB default
        maxItems = 1000,
        namespace = 'default',
    } = {}) {
        this.maxSize = maxSize
        this.currentSize = 0
        this.namespace = namespace
        this.cache = new Map()
        this.lruList = []
        this.maxMetrics = maxItems
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000)
        logger.debug('Cache initialized', { namespace, maxSize, maxItems })
    }

    private getEntrySize(value: T): number {
        try {
            return JSON.stringify(value).length * 2 // UTF-16
        } catch {
            return 0
        }
    }

    private addMetric(metric: CacheMetrics): void {
        this.metrics.push(metric)
        if (this.metrics.length > this.maxMetrics) {
            this.metrics.shift()
        }
    }

    set(key: string, value: T, ttl = 3600000): void {
        performanceMonitor.startTiming(`cache.set.${this.namespace}`)
        try {
            const fullKey = `${this.namespace}:${key}`
            const size = this.getEntrySize(value)

            // Remove old entry if it exists
            if (this.cache.has(fullKey)) {
                const oldEntry = this.cache.get(fullKey)!
                this.currentSize -= oldEntry.size
                this.lruList = this.lruList.filter(k => k !== fullKey)
            }

            // Add new entry
            const timestamp = Date.now()
            this.cache.set(fullKey, { value, timestamp, size })
            this.currentSize += size
            this.lruList.push(fullKey)

            // Record metric
            this.addMetric({
                key: fullKey,
                size,
                value,
                timestamp,
            })

            // Cleanup if needed
            while (this.currentSize > this.maxSize) {
                this.evictOldest()
            }

            performanceMonitor.endTiming(`cache.set.${this.namespace}`)
        } catch (error) {
            logger.error('Failed to set cache entry', error as Error, {
                key,
                namespace: this.namespace,
            })
            throw new AppError('Failed to set cache entry', 'CACHE_ERROR', 500, {
                key,
                namespace: this.namespace,
            })
        }
    }

    private evictOldest(): void {
        const oldestKey = this.lruList[0]
        if (oldestKey) {
            const entry = this.cache.get(oldestKey)
            if (entry) {
                this.currentSize -= entry.size
                this.cache.delete(oldestKey)
                this.lruList.shift()
                logger.debug('Cache entry evicted', {
                    key: oldestKey,
                    size: entry.size,
                    namespace: this.namespace,
                })
            }
        }
    }

    get(key: string): T | null {
        performanceMonitor.startTiming(`cache.get.${this.namespace}`)
        try {
            const fullKey = `${this.namespace}:${key}`
            const entry = this.cache.get(fullKey)

            if (!entry) {
                performanceMonitor.endTiming(`cache.get.${this.namespace}`)
                return null
            }

            // Update LRU order
            this.lruList = this.lruList.filter(k => k !== fullKey)
            this.lruList.push(fullKey)

            performanceMonitor.endTiming(`cache.get.${this.namespace}`)
            return entry.value
        } catch (error) {
            logger.error('Failed to get cache entry', error as Error, {
                key,
                namespace: this.namespace,
            })
            performanceMonitor.endTiming(`cache.get.${this.namespace}`)
            return null
        }
    }

    clear(): void {
        this.cache.clear()
        this.lruList = []
        this.currentSize = 0
        this.metrics = []
        logger.debug('Cache cleared', { namespace: this.namespace })
    }

    private cleanup(): void {
        const now = Date.now()
        const keysToDelete: string[] = []

        this.cache.forEach((entry, key) => {
            if (now - entry.timestamp > 3600000) {
                keysToDelete.push(key)
            }
        })

        keysToDelete.forEach(key => {
            const entry = this.cache.get(key)
            if (entry) {
                this.currentSize -= entry.size
                this.cache.delete(key)
                this.lruList = this.lruList.filter(k => k !== key)
            }
        })

        if (keysToDelete.length > 0) {
            logger.debug('Cache cleanup completed', {
                entriesRemoved: keysToDelete.length,
                namespace: this.namespace,
            })
        }
    }

    getMetrics(): CacheMetrics[] {
        return [...this.metrics]
    }

    dispose(): void {
        clearInterval(this.cleanupInterval)
        this.clear()
    }
}

// Exports
export function createCache<T>(config?: {
    maxSize?: number
    maxItems?: number
    namespace?: string
}): Cache<T> {
    return new Cache<T>(config)
}

// Performance tracking decorator
export function withPerformanceTracking<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    name: string
): T {
    return (async (...args: Parameters<T>) => {
        const startTime = performance.now()
        try {
            return await fn(...args)
        } finally {
            performanceMonitor.addMetric({
                name,
                value: performance.now() - startTime,
                timestamp: Date.now(),
                metadata: { args },
            })
        }
    }) as T
}

// Utility functions for expensive operations
export function debounce<T extends (...args: any[]) => void>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => fn(...args), delay)
    }
}

export function throttle<T extends (...args: any[]) => void>(
    fn: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle = false
    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            fn(...args)
            inThrottle = true
            setTimeout(() => (inThrottle = false), limit)
        }
    }
}
