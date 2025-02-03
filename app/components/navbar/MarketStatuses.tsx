import React, { memo, useState, Dispatch, SetStateAction, useMemo } from 'react'
import { Separator } from '@/app/components/ui/separator'
import { MarketStatus } from './MarketStatus'
import { useMediaQuery } from '@/lib/utils/hooks/use-media-query'
import { cn } from '@/lib/utils'

const MARKET_CONFIG = [
    { timeZone: 'UTC', labelPrefix: 'UTC' },
    { timeZone: 'America/New_York', labelPrefix: 'NYC' },
    { timeZone: 'America/Los_Angeles', labelPrefix: 'SF' },
    { timeZone: 'Asia/Hong_Kong', labelPrefix: 'HK' },
] as const

interface MarketStatusesProps {
    activeMarket: string | null
    onMarketClick: Dispatch<SetStateAction<string | null>>
}

export const MarketStatuses = memo(({ activeMarket, onMarketClick }: MarketStatusesProps) => {
    const isMobile = useMediaQuery('(max-width: 768px)')

    const marketItems = useMemo(
        () =>
            MARKET_CONFIG.map((market, index) => (
                <React.Fragment key={market.timeZone}>
                    {index > 0 && !isMobile && <Separator orientation="vertical" className="h-3" />}
                    <div className={cn('flex items-center', isMobile && 'min-w-[52px]')}>
                        <MarketStatus timeZone={market.timeZone} labelPrefix={market.labelPrefix} />
                    </div>
                </React.Fragment>
            )),
        [isMobile]
    )

    return (
        <div
            className={cn(
                'flex items-center',
                isMobile ? 'gap-2 w-max px-1 py-0.5 bg-muted/20 rounded-lg' : 'gap-2 sm:gap-3'
            )}
        >
            {marketItems}
        </div>
    )
})
MarketStatuses.displayName = 'MarketStatuses'
