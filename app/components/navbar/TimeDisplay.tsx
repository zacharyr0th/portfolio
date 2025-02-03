import { memo, useEffect, useState, useCallback, useMemo } from 'react'
import { useIsClient } from '@/lib/utils/hooks/use-is-client'
import { cn } from '@/lib/utils'

interface TimeDisplayProps {
    timeZone: string
    prefix: string
    className?: string
}

const formatTimeOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
} as const

export const TimeDisplay = memo(({ timeZone, prefix, className }: TimeDisplayProps) => {
    const [time, setTime] = useState<string>('--:--')
    const isClient = useIsClient()

    const formatTime = useCallback(
        (date: Date) => {
            return date.toLocaleTimeString('en-US', { ...formatTimeOptions, timeZone })
        },
        [timeZone]
    )

    const updateTime = useCallback(() => {
        const now = new Date()
        setTime(formatTime(now))
    }, [formatTime])

    useEffect(() => {
        if (!isClient) return

        updateTime()
        // Update every 30 seconds instead of every second since microsecond precision isn't needed
        const timer = setInterval(updateTime, 30000)
        return () => clearInterval(timer)
    }, [isClient, updateTime])

    return (
        <span className={cn('text-xs sm:text-[11px] font-medium tabular-nums', className)}>
            {`${prefix}${prefix ? ': ' : ''}${time}`}
        </span>
    )
})
TimeDisplay.displayName = 'TimeDisplay'
