import type { ChartData, ChartDataItem } from './calculations'

export type ChartDataKey = keyof ChartData

export interface TrendData {
    change: number
    period: string
}

export interface SectorProps {
    cx: number
    cy: number
    innerRadius: number
    outerRadius: number
    startAngle: number
    endAngle: number
    fill: string
    payload?: any
    value?: number
    percent?: number
}

export interface ChartDimensions {
    width: number
    height: number
    outerRadius: number
    innerRadius: number
}

export interface ChartDataItemWithTrend extends ChartDataItem {
    trend?: TrendData
}

export interface LegendItemProps extends ChartDataItemWithTrend {
    isActive: boolean
    onMouseEnter: () => void
    onMouseLeave: () => void
    isPrivate: boolean
}

export interface LegendProps {
    data: ChartDataItemWithTrend[]
    className?: string
    activeIndex: number | null
    onHover: (index: number | null) => void
    isPrivate: boolean
}

export interface PieChartContentProps {
    data: ChartDataItemWithTrend[]
    portfolioTotal: number
    activeIndex: number | null
    onMouseEnter: (_: any, index: number) => void
    onMouseLeave: () => void
    onClick: (entry: ChartDataItemWithTrend) => void
    isPrivate: boolean
}

export interface ChartSectionProps {
    data: ChartDataItemWithTrend[]
    portfolioTotal: number
    onItemClick?: (name: string) => void
    isPrivate: boolean
}

export interface PortfolioTabsProps {
    chartData: ChartData
    portfolioTotal: number
    onItemClick: (name: string) => void
}

export type { ChartData }