'use client'

import { memo, useState, useMemo, useCallback } from 'react'
import { CircleDollarSign, Search } from 'lucide-react'
import { Input } from '@/app/components/ui/input'
import { Card } from '@/app/components/ui/card'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/app/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { MarketStatuses } from './MarketStatuses'
import { usePortfolio } from '@/app/context/portfolio'
import { useMediaQuery } from '@/lib/utils/hooks/use-media-query'

const SearchInput = memo(() => {
    const [isFocused, setIsFocused] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const isMobile = useMediaQuery('(max-width: 768px)')

    const placeholder = useMemo(() => {
        if (typeof window === 'undefined') return 'Search...'
        return isMobile && !isFocused ? '' : 'Search...'
    }, [isFocused, isMobile])

    const inputWidth = useMemo(() => {
        if (isFocused || searchTerm) {
            return isMobile ? 'w-[140px]' : 'w-[180px] sm:w-[240px] lg:w-[320px]'
        }
        return isMobile ? 'w-[40px]' : 'w-[140px] sm:w-[180px] lg:w-[240px]'
    }, [isFocused, searchTerm, isMobile])

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value)
    }, [])

    const handleFocus = useCallback(() => setIsFocused(true), [])
    const handleBlur = useCallback(() => setIsFocused(false), [])

    return (
        <div
            className={cn(
                'relative transition-all duration-200',
                inputWidth,
                isMobile && 'shrink-0'
            )}
        >
            <Search
                className={cn(
                    'absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4',
                    isFocused || searchTerm ? 'text-foreground' : 'text-muted-foreground'
                )}
            />
            <Input
                type="search"
                value={searchTerm}
                onChange={handleChange}
                placeholder={placeholder}
                aria-label="Search"
                className={cn(
                    'pl-8 h-8 bg-background/50 w-full text-sm transition-all duration-200',
                    'focus:ring-1 focus:ring-ring',
                    isMobile && 'touch-manipulation'
                )}
                onFocus={handleFocus}
                onBlur={handleBlur}
            />
        </div>
    )
})
SearchInput.displayName = 'SearchInput'

const TotalValue = memo(({ value }: { value: number }) => {
    const { isPrivate } = usePortfolio()
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Card className="flex items-center space-x-2 bg-background/50 px-2 sm:px-3 py-1">
                    <CircleDollarSign className="h-4 w-4 text-emerald-500" />
                    <span className="font-bold text-xs">
                        {isPrivate ? '•••••' : `$${Math.round(value).toLocaleString()}`}
                    </span>
                </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom">
                <p className="text-xs">Total Portfolio Value</p>
            </TooltipContent>
        </Tooltip>
    )
})

TotalValue.displayName = 'TotalValue'

export const NavBar = memo(() => {
    const { currentBalance } = usePortfolio()
    const totalValue = useMemo(() => currentBalance?.total || 0, [currentBalance])
    const [activeMarket, setActiveMarket] = useState<string | null>(null)
    const isMobile = useMediaQuery('(max-width: 768px)')

    return (
        <TooltipProvider delayDuration={300}>
            <div className="sticky top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <Card className="border-b rounded-none shadow-sm">
                    <div className="container mx-auto max-w-full px-2">
                        <div className="flex h-12 items-center justify-between gap-2">
                            <SearchInput />
                            <div className="flex items-center gap-2 text-xs font-mono shrink-0">
                                {!isMobile && (
                                    <MarketStatuses
                                        activeMarket={activeMarket}
                                        onMarketClick={setActiveMarket}
                                    />
                                )}
                                <TotalValue value={totalValue} />
                            </div>
                        </div>
                        {isMobile && (
                            <div className="pb-2 -mx-2 overflow-x-auto scrollbar-hide flex justify-center">
                                <MarketStatuses
                                    activeMarket={activeMarket}
                                    onMarketClick={setActiveMarket}
                                />
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </TooltipProvider>
    )
})
NavBar.displayName = 'NavBar'
