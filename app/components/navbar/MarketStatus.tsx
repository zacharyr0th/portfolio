import { memo, useEffect, useRef, useState, useCallback } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip'
import { useIsClient } from '@/lib/utils/hooks/use-is-client'
import { cn } from '@/lib/utils'
import { TimeDisplay } from './TimeDisplay'

type MarketConfig = {
    start: number
    end: number
    startMinutes?: number
    endMinutes?: number
}

const MARKET_HOURS: Record<string, MarketConfig> = {
    UTC: { start: 8, end: 16, endMinutes: 30 },
    'America/New_York': { start: 9, startMinutes: 30, end: 16 },
    'Asia/Hong_Kong': { start: 9, startMinutes: 30, end: 16 },
} as const

type TimeZone = keyof typeof MARKET_HOURS

const isMarketOpen = (date: Date, config: MarketConfig): boolean => {
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const day = date.getDay()

    if (day === 0 || day === 6) return false

    const startTime = config.startMinutes
        ? hours > config.start || (hours === config.start && minutes >= config.startMinutes)
        : hours >= config.start

    const endTime = config.endMinutes
        ? hours < config.end || (hours === config.end && minutes <= config.endMinutes)
        : hours < config.end

    return startTime && endTime
}

interface MarketStatusProps {
    timeZone: TimeZone | 'America/Los_Angeles'
    labelPrefix: string
}

export const MarketStatus = memo(({ timeZone, labelPrefix }: MarketStatusProps) => {
    const isClient = useIsClient()
    const [isOpen, setIsOpen] = useState<boolean | null>(null)
    const timerRef = useRef<NodeJS.Timeout>()

    const checkMarketStatus = useCallback(() => {
        if (timeZone === 'America/Los_Angeles') return
        const localTime = new Date().toLocaleString('en-US', { timeZone })
        const marketTime = new Date(localTime)
        const config = MARKET_HOURS[timeZone as TimeZone]
        setIsOpen(config ? isMarketOpen(marketTime, config) : false)
    }, [timeZone])

    useEffect(() => {
        if (!isClient) return

        checkMarketStatus()
        // Update every 5 minutes instead of every minute since market status rarely changes
        timerRef.current = setInterval(checkMarketStatus, 300000)

        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [isClient, checkMarketStatus])

    const isSF = timeZone === 'America/Los_Angeles'

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span
                    className={cn(
                        'flex items-center gap-1 cursor-pointer whitespace-nowrap touch-manipulation select-none px-1 py-0.5 rounded hover:bg-muted/50',
                        isSF ? 'text-foreground' : 'text-muted-foreground'
                    )}
                >
                    <span
                        className={cn(
                            'transition-colors font-medium text-[11px]',
                            isSF
                                ? 'text-foreground'
                                : isOpen
                                  ? 'text-emerald-500'
                                  : 'text-muted-foreground'
                        )}
                    >
                        {labelPrefix}
                    </span>
                    <TimeDisplay timeZone={timeZone} prefix="" className="text-[11px]" />
                </span>
            </TooltipTrigger>
            <TooltipContent
                side="bottom"
                align="center"
                sideOffset={8}
                className="touch-manipulation z-[60] px-2 py-1"
                avoidCollisions={true}
            >
                <p className="font-medium text-[11px] whitespace-nowrap">
                    {isOpen ? 'Market Open' : 'Market Closed'}
                </p>
            </TooltipContent>
        </Tooltip>
    )
})
MarketStatus.displayName = 'MarketStatus'
