'use client'

import { Separator } from '@/app/components/ui/separator'
import { cn } from '@/lib/utils'
import { AlertCircle, ChevronDown } from 'lucide-react'
import { memo, useMemo, useState } from 'react'
import { useMarketData } from './use-market-data'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider,
} from '@/app/components/ui/tooltip'
import { BaseSidebar } from './BaseSidebar'
import { SidebarProps, MarketItemProps, MarketSectionProps } from './types'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/app/components/ui/collapsible'
import { Button } from '@/app/components/ui/button'

const MarketItem = memo(({ label, value, change, isPositive, index }: MarketItemProps) => {
    const itemClasses = useMemo(
        () =>
            cn(
                'flex items-center justify-between px-3 py-2.5 md:py-1.5 hover:bg-accent/50 rounded-sm transition-all duration-200 touch-manipulation'
            ),
        []
    )

    const changeClasses = useMemo(
        () => cn('text-sm md:text-xs font-medium', isPositive ? 'text-green-500' : 'text-red-500'),
        [isPositive]
    )

    return (
        <div className={itemClasses}>
            <div className="flex items-center gap-2">
                <span className="text-sm md:text-xs">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm md:text-xs font-medium">{value}</span>
                <span className={changeClasses}>{change}</span>
            </div>
        </div>
    )
})
MarketItem.displayName = 'MarketItem'

const MarketSection = memo(
    ({
        title,
        children,
        isOpen,
        onOpenChange,
    }: MarketSectionProps & {
        isOpen: boolean
        onOpenChange: (open: boolean) => void
    }) => {
        return (
            <div className="space-y-1 md:space-y-0.5">
                <Collapsible open={isOpen} onOpenChange={onOpenChange}>
                    <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between text-sm md:text-xs font-semibold text-muted-foreground px-3 py-2 md:py-1 uppercase tracking-wider hover:bg-accent/50 rounded-sm transition-all duration-200">
                            <span>{title}</span>
                            <ChevronDown
                                className={cn(
                                    'h-4 w-4 transition-transform duration-200',
                                    isOpen ? 'transform rotate-0' : 'transform -rotate-90'
                                )}
                            />
                        </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        {children}
                        <div className="px-2">
                            <Separator />
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </div>
        )
    }
)
MarketSection.displayName = 'MarketSection'

const LoadingState = memo(() => (
    <div className="px-3 py-3 md:py-2 text-base md:text-sm text-muted-foreground animate-pulse">
        Loading crypto market data...
    </div>
))
LoadingState.displayName = 'LoadingState'

const ErrorState = memo(({ error }: { error: string }) => (
    <div>
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="px-3 py-3 md:py-2 text-base md:text-sm text-red-500 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 md:h-4 md:w-4" />
                    <span>Failed to load crypto market data</span>
                </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="start" className="max-w-[300px]">
                <div className="space-y-2 text-sm md:text-xs">
                    <p className="font-semibold">Error: {error}</p>
                </div>
            </TooltipContent>
        </Tooltip>
    </div>
))
ErrorState.displayName = 'ErrorState'

const LastUpdated = memo(({ date }: { date: Date }) => (
    <div className="px-3 py-2 md:py-1 text-xs md:text-[10px] text-muted-foreground">
        Last updated: {date.toLocaleTimeString()}
    </div>
))
LastUpdated.displayName = 'LastUpdated'

const MarketContent = memo(() => {
    const { crypto } = useMarketData()
    const {
        sections: cryptoSections,
        loading: cryptoLoading,
        error: cryptoError,
        lastUpdated: cryptoLastUpdated,
    } = crypto

    const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
    const allSectionsOpen =
        Object.values(openSections).every(Boolean) && Object.keys(openSections).length > 0

    const orderedSections = useMemo(() => {
        const sectionOrder = ['Majors', 'Alt L1s', 'L2s', 'AI', 'Memes']
        return cryptoSections.sort((a, b) => {
            const aIndex = sectionOrder.indexOf(a.title)
            const bIndex = sectionOrder.indexOf(b.title)
            // If both sections are in sectionOrder, sort by their order
            if (aIndex !== -1 && bIndex !== -1) {
                return aIndex - bIndex
            }
            // If only one section is in sectionOrder, prioritize it
            if (aIndex !== -1) return -1
            if (bIndex !== -1) return 1
            // If neither section is in sectionOrder, maintain their original order
            return 0
        })
    }, [cryptoSections])

    const toggleAllSections = () => {
        const newState = !allSectionsOpen
        const updatedSections = orderedSections.reduce(
            (acc, section) => ({
                ...acc,
                [section.title]: newState,
            }),
            {}
        )
        setOpenSections(updatedSections)
    }

    const handleSectionToggle = (title: string, isOpen: boolean) => {
        setOpenSections(prev => ({ ...prev, [title]: isOpen }))
    }

    return (
        <div className="space-y-3 md:space-y-2 py-3 md:py-2 transition-all duration-200">
            {!cryptoLoading && !cryptoError && orderedSections.length > 0 && (
                <div className="px-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleAllSections}
                        className="w-full text-xs"
                    >
                        {allSectionsOpen ? 'Collapse All' : 'Expand All'}
                    </Button>
                </div>
            )}

            {cryptoLoading ? (
                <LoadingState />
            ) : cryptoError ? (
                <ErrorState error={cryptoError} />
            ) : (
                orderedSections.map(section => (
                    <div key={section.title} className="transition-all duration-200">
                        <MarketSection
                            title={section.title}
                            isOpen={openSections[section.title] ?? false}
                            onOpenChange={isOpen => handleSectionToggle(section.title, isOpen)}
                        >
                            <div className="transition-all duration-200">
                                {section.items.map(item => (
                                    <MarketItem
                                        key={item.symbol}
                                        label={item.symbol}
                                        value={item.value}
                                        change={item.change}
                                        isPositive={item.isPositive}
                                        index={0}
                                    />
                                ))}
                            </div>
                        </MarketSection>
                    </div>
                ))
            )}

            {cryptoLastUpdated && <LastUpdated date={cryptoLastUpdated} />}
        </div>
    )
})
MarketContent.displayName = 'MarketContent'

export const RightSidebar = memo(({ isOpen, onToggle }: SidebarProps) => {
    return (
        <TooltipProvider>
            <BaseSidebar isOpen={isOpen} onToggle={onToggle} side="right" label="market data">
                <MarketContent />
            </BaseSidebar>
        </TooltipProvider>
    )
})
RightSidebar.displayName = 'RightSidebar'
