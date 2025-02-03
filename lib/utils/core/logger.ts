export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogMetadata = Record<string, unknown>

export interface LogEntry {
    level: LogLevel
    message: string
    timestamp: string
    metadata?: LogMetadata
    count?: number
}

export interface ContextLogger {
    debug: (message: string, metadata?: LogMetadata) => void
    info: (message: string, metadata?: LogMetadata) => void
    warn: (message: string, metadata?: LogMetadata) => void
    error: (message: string, error?: Error, metadata?: LogMetadata) => void
}

// Pre-compute log level values for faster comparison
const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
} as const

// Pre-compile sensitive patterns for better performance
const SENSITIVE_PATTERNS = [
    'password',
    'secret',
    'token',
    'key',
    'auth',
    'credential',
    'private',
    'cvv',
    'card',
    'account',
    'signature',
    'sign',
    'api[-_]?key',
    'api[-_]?secret',
    'payload',
    'nonce',
    'bearer',
    'jwt',
    'session',
]

// Optimized logger class
class Logger {
    private static instance: Logger
    private readonly logs: LogEntry[]
    private readonly maxLogs: number
    private logLevel: LogLevel
    private readonly consoleMethodMap: Record<LogLevel, 'debug' | 'info' | 'warn' | 'error'>
    private readonly sensitivePatterns: RegExp[]
    private readonly messageCache: Map<string, { timestamp: number; count: number }>
    private readonly MESSAGE_THROTTLE = 5000 // 5 seconds

    private constructor() {
        this.logs = []
        this.maxLogs = 1000
        this.logLevel = process.env.NODE_ENV === 'development' ? 'warn' : 'error'
        this.consoleMethodMap = {
            debug: 'debug',
            info: 'info',
            warn: 'warn',
            error: 'error',
        }
        this.messageCache = new Map()
        // Create RegExp instances once during initialization
        this.sensitivePatterns = SENSITIVE_PATTERNS.map(pattern => new RegExp(pattern, 'i'))
    }

    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger()
        }
        return Logger.instance
    }

    setLogLevel(level: LogLevel): void {
        this.logLevel = level
    }

    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVELS[level] >= LOG_LEVELS[this.logLevel]
    }

    private filterSensitiveData(data: unknown): unknown {
        if (!data) return data

        if (typeof data === 'string') {
            return this.sensitivePatterns.some(pattern => pattern.test(data)) ? '[REDACTED]' : data
        }

        if (Array.isArray(data)) {
            return data.map(item => this.filterSensitiveData(item))
        }

        if (typeof data === 'object' && data !== null) {
            const filtered: Record<string, unknown> = {}
            for (const [key, value] of Object.entries(data)) {
                filtered[key] = this.sensitivePatterns.some(pattern => pattern.test(key))
                    ? '[REDACTED]'
                    : this.filterSensitiveData(value)
            }
            return filtered
        }

        return data
    }

    private shouldThrottle(key: string): boolean {
        const now = Date.now()
        const cached = this.messageCache.get(key)

        if (!cached) {
            this.messageCache.set(key, { timestamp: now, count: 1 })
            return false
        }

        if (now - cached.timestamp < this.MESSAGE_THROTTLE) {
            cached.count++
            this.messageCache.set(key, cached)
            return true
        }

        this.messageCache.set(key, { timestamp: now, count: 1 })
        return false
    }

    private addLog(entry: LogEntry): void {
        if (!this.shouldLog(entry.level)) return

        // Create cache key from level, message and metadata
        const cacheKey = `${entry.level}:${entry.message}:${JSON.stringify(entry.metadata || '')}`
        
        // Check if we should throttle this message
        if (this.shouldThrottle(cacheKey)) {
            const cached = this.messageCache.get(cacheKey)
            if (cached && cached.count > 1) {
                // Update the last log entry with the new count
                const lastLog = this.logs[0]
                if (lastLog && lastLog.message === entry.message) {
                    lastLog.count = cached.count
                }
            }
            return
        }

        // Filter sensitive data before logging
        const filteredEntry = {
            ...entry,
            metadata: entry.metadata
                ? (this.filterSensitiveData(entry.metadata) as LogMetadata)
                : undefined,
            count: 1,
        }

        // Use unshift for better performance than push + shift
        if (this.logs.length >= this.maxLogs) {
            this.logs.pop()
        }
        this.logs.unshift(filteredEntry)

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            const method = this.consoleMethodMap[entry.level]
            const timestamp = filteredEntry.timestamp
            const count = filteredEntry.count > 1 ? ` (${filteredEntry.count}x)` : ''
            const formattedMessage = `[${timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${count}`
            
            if (filteredEntry.metadata) {
                console[method](formattedMessage, filteredEntry.metadata)
            } else {
                console[method](formattedMessage)
            }
        }
    }

    private createLogEntry(level: LogLevel, message: string, metadata?: LogMetadata): LogEntry {
        return {
            level,
            message,
            timestamp: new Date().toISOString(),
            metadata,
        }
    }

    debug(message: string, metadata?: LogMetadata): void {
        this.addLog(this.createLogEntry('debug', message, metadata))
    }

    info(message: string, metadata?: LogMetadata): void {
        this.addLog(this.createLogEntry('info', message, metadata))
    }

    warn(message: string, metadata?: LogMetadata): void {
        this.addLog(this.createLogEntry('warn', message, metadata))
    }

    error(message: string, error?: Error, metadata?: LogMetadata): void {
        this.addLog(
            this.createLogEntry('error', message, {
                ...metadata,
                error: error && {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                },
            })
        )
    }

    getLogs(level?: LogLevel): readonly LogEntry[] {
        return level ? this.logs.filter(log => log.level === level) : this.logs
    }

    clearLogs(): void {
        this.logs.length = 0
        this.messageCache.clear()
    }

    async exportLogs(): Promise<string> {
        return JSON.stringify(this.logs)
    }
}

// Export singleton instance
export const logger = Logger.getInstance()

// Optimized error logging wrapper
export function withErrorLogging<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context: string
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    return async function (this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
        try {
            return await fn.apply(this, args)
        } catch (error) {
            logger.error(
                `Error in ${context}`,
                error instanceof Error ? error : new Error(String(error)),
                { args }
            )
            throw error
        }
    }
}

// Optimized context logger factory
export function createContextLogger(context: string): ContextLogger {
    const prefix = `[${context}] `
    return {
        debug: (message: string, metadata?: LogMetadata) => logger.debug(prefix + message, metadata),
        info: (message: string, metadata?: LogMetadata) => logger.info(prefix + message, metadata),
        warn: (message: string, metadata?: LogMetadata) => logger.warn(prefix + message, metadata),
        error: (message: string, error?: Error, metadata?: LogMetadata) =>
            logger.error(prefix + message, error, metadata)
    }
}
