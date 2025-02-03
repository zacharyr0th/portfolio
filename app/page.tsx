'use client'

import { AccountList } from '@/app/components/accounts'
import { PortfolioChart } from '@/app/components/charts'
import { useMediaQuery } from '@/lib/utils/hooks/use-media-query'
import { cn } from '@/lib/utils'

export default function Home() {
    const isMobile = useMediaQuery('(max-width: 768px)')

    return (
        <main
            className={cn(
                'container mx-auto space-y-4',
                isMobile ? 'p-2 pb-safe' : 'p-4',
                'touch-manipulation'
            )}
        >
            <div className={cn('w-full mx-auto', 'max-w-[1800px]', 'flex flex-col', 'gap-4')}>
                <div
                    className={cn('w-full', 'rounded-lg', 'overflow-hidden', 'mobile-touch-target')}
                >
                    <PortfolioChart />
                </div>
                <div className={cn('w-full', 'mobile-text')}>
                    <AccountList
                        variant="detailed"
                        showSearch
                        allowExpandAll
                        className={cn('mobile-snap-scroll', isMobile && 'pb-safe')}
                    />
                </div>
            </div>
        </main>
    )
}
