import { memo, useCallback, useMemo } from 'react'
import { ErrorBoundary } from '@/app/components/ui/error-boundary'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs'
import { usePortfolio } from '@/app/context/portfolio'
import { useRouter } from 'next/navigation'
import { ChartSection } from './Chart'
import { processPortfolioData } from '../calculations'
import { CATEGORY_TO_TYPE_MAP, TABS, type CategoryType } from '../constants'
import type { PortfolioTabsProps } from '../types'

// Error Fallback Component
const ChartErrorFallback = memo(() => (
    <div className="flex items-center justify-center h-full min-h-[200px] md:min-h-[300px] text-muted-foreground">
        Unable to load chart data. Please try again later.
    </div>
))

// Portfolio Tabs Component
const PortfolioTabs = memo(({ chartData, portfolioTotal, onItemClick }: PortfolioTabsProps) => {
    const { isPrivate, togglePrivacy } = usePortfolio()

    const renderChart = useCallback(
        (type: keyof typeof chartData) => (
            <ErrorBoundary>
                <ChartSection
                    data={chartData[type]}
                    portfolioTotal={portfolioTotal}
                    onItemClick={onItemClick}
                    isPrivate={isPrivate}
                />
            </ErrorBoundary>
        ),
        [chartData, portfolioTotal, onItemClick, isPrivate]
    )

    return (
        <Tabs defaultValue="portfolio" className="w-full flex flex-col items-center">
            <div className="w-full flex justify-center border-b border-border/40 bg-transparent sticky top-0 z-10 backdrop-blur-sm">
                <div className="w-full max-w-[800px] flex items-center justify-between px-3 md:px-6">
                    <div className="flex-1" />
                    <TabsList className="bg-transparent flex h-auto min-h-0 gap-1 mx-auto">
                        {TABS.map(tab => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="px-4 md:px-6 py-2 md:py-2.5 text-sm md:text-base text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-foreground hover:text-foreground/80 bg-transparent transition-all duration-200 rounded-none data-[state=active]:bg-foreground/[0.03] whitespace-nowrap font-medium"
                            >
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    <div className="flex-1 flex justify-end">
                        <button
                            onClick={togglePrivacy}
                            className="p-2 rounded-lg hover:bg-foreground/5 transition-colors"
                            aria-label={isPrivate ? 'Show values' : 'Hide values'}
                        >
                            {isPrivate ? (
                                <EyeOffIcon className="w-5 h-5" />
                            ) : (
                                <EyeIcon className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div className="w-full flex justify-center py-4 md:py-6">
                {TABS.map(tab => (
                    <TabsContent
                        key={tab.value}
                        value={tab.value}
                        className="mt-0 w-full max-w-[800px] px-3 md:px-6 animate-in fade-in-50 duration-200"
                    >
                        {renderChart(tab.value)}
                    </TabsContent>
                ))}
            </div>
        </Tabs>
    )
})

// Portfolio Chart Component
export const PortfolioChart = memo(function PortfolioChart() {
    const { accounts, currentBalance } = usePortfolio()
    const router = useRouter()

    const chartData = useMemo(() => {
        if (!accounts.length) return null
        return processPortfolioData(accounts)
    }, [accounts])

    const handleItemClick = useCallback(
        (name: string) => {
            const accountType = CATEGORY_TO_TYPE_MAP[name as CategoryType]
            if (accountType) {
                router.push(`/?filter=${accountType}`)
            }
        },
        [router]
    )

    if (!accounts.length || !chartData) {
        return (
            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground space-y-2">
                <p>No portfolio data available</p>
                <p className="text-sm">Add accounts to see your portfolio overview</p>
            </div>
        )
    }

    return (
        <PortfolioTabs
            chartData={chartData}
            portfolioTotal={currentBalance.total}
            onItemClick={handleItemClick}
        />
    )
})

// Set display names
ChartErrorFallback.displayName = 'ChartErrorFallback'
PortfolioTabs.displayName = 'PortfolioTabs'

export { PortfolioTabs }
