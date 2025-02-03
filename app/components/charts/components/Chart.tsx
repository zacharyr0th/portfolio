import { memo, useCallback, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Sector, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils/core/format'
import { cn } from '@/lib/utils'
import { COLORS, getAssetColor } from '../constants'
import { useChartDimensions } from '../hooks'
import type {
    PieChartContentProps,
    LegendProps,
    LegendItemProps,
    SectorProps,
    ChartSectionProps,
} from '../types'

// Custom tooltip component
const CustomTooltip = ({ active, payload, isPrivate }: any) => {
    if (!active || !payload?.[0]) return null
    const data = payload[0].payload
    return (
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-3">
            <div className="font-medium">{data.name}</div>
            <div className="text-sm text-muted-foreground">
                {isPrivate ? '•••••' : formatCurrency(data.value)}
            </div>
            <div className="text-xs text-muted-foreground/80">
                {isPrivate ? '••' : `${data.percentage.toFixed(1)}%`}
            </div>
        </div>
    )
}

// Simple text display component
const ValueDisplay = memo(
    ({
        value,
        label,
        percentage,
        isPrivate,
        trend,
    }: {
        value: number
        label?: string
        percentage?: number
        isPrivate: boolean
        trend?: { change: number; period: string }
    }) => {
        const formattedValue = isPrivate ? '•••••' : formatCurrency(Math.round(value))
        const trendColor = trend?.change !== undefined ? (trend?.change > 0 ? 'text-green-500' : trend?.change < 0 ? 'text-red-500' : '') : ''

        return (
            <div className="flex flex-col items-center justify-center text-center gap-1">
                {label && (
                    <div className="text-xs md:text-sm font-medium text-muted-foreground">
                        {label}
                    </div>
                )}
                <div className="text-2xl md:text-2xl lg:text-3xl font-mono font-semibold tracking-tight tabular-nums -mt-1">
                    {formattedValue}
                </div>
                {percentage !== undefined && (
                    <div className="text-[10px] md:text-xs text-muted-foreground/80 font-medium -mt-1">
                        {isPrivate ? '••' : Math.round(percentage)}%
                    </div>
                )}
                {trend && !isPrivate && (
                    <div className={cn("text-xs font-medium flex items-center gap-1", trendColor)}>
                        {trend.change > 0 ? '↑' : trend.change < 0 ? '↓' : '→'}
                        {Math.abs(trend.change).toFixed(2)}% ({trend.period})
                    </div>
                )}
            </div>
        )
    }
)

// Active shape renderer for hover effect
const renderActiveShape = (props: unknown) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props as SectorProps
    return (
        <g>
            <defs>
                <linearGradient id={`gradient-${fill}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={fill} stopOpacity={1} />
                    <stop offset="100%" stopColor={fill} stopOpacity={0.8} />
                </linearGradient>
            </defs>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 8}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={`url(#gradient-${fill})`}
                className="filter drop-shadow-md transition-all duration-300"
            />
            <Sector
                cx={cx}
                cy={cy}
                startAngle={startAngle}
                endAngle={endAngle}
                innerRadius={outerRadius + 8}
                outerRadius={outerRadius + 16}
                fill={fill}
                opacity={0.35}
                className="transition-all duration-300"
            />
        </g>
    )
}

// Main pie chart component
const PieChartContent = memo(
    ({
        data,
        portfolioTotal,
        activeIndex,
        onMouseEnter,
        onMouseLeave,
        onClick,
        isPrivate,
    }: PieChartContentProps) => {
        const chartDimensions = useChartDimensions()

        const cells = useMemo(
            () =>
                data.map(entry => {
                    const color = COLORS[entry.name as keyof typeof COLORS] || getAssetColor(entry.name)
                    return (
                        <Cell
                            key={entry.name}
                            fill={color}
                            stroke="none"
                            className="transition-all duration-300 ease-in-out"
                            opacity={
                                activeIndex === null || data.indexOf(entry) === activeIndex ? 1 : 0.3
                            }
                        />
                    )
                }),
            [data, activeIndex]
        )

        const activeItem = activeIndex !== null ? data[activeIndex] : null

        return (
            <div className="relative aspect-square w-full max-w-[500px] mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            activeIndex={activeIndex ?? undefined}
                            activeShape={renderActiveShape}
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={chartDimensions.innerRadius}
                            outerRadius={chartDimensions.outerRadius}
                            dataKey="value"
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}
                            onClick={(_, index) => {
                                const item = data[index]
                                if (item) onClick(item)
                            }}
                            className="cursor-pointer"
                            paddingAngle={2}
                            animationBegin={0}
                            animationDuration={800}
                            animationEasing="ease-out"
                            minAngle={15}
                        >
                            {cells}
                        </Pie>
                        <Tooltip 
                            content={<CustomTooltip isPrivate={isPrivate} />}
                            wrapperStyle={{ outline: 'none' }}
                        />
                    </PieChart>
                </ResponsiveContainer>

                {/* Centered Text Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <ValueDisplay
                            value={activeItem ? activeItem.value : portfolioTotal}
                            label={activeItem?.name}
                            percentage={activeItem?.percentage}
                            isPrivate={isPrivate}
                            trend={activeItem?.trend}
                        />
                    </div>
                </div>
            </div>
        )
    }
)

// Legend item component
const LegendItem = memo(
    ({
        name,
        value,
        percentage,
        isActive,
        onMouseEnter,
        onMouseLeave,
        isPrivate,
        trend,
    }: LegendItemProps) => {
        const backgroundColor = useMemo(
            () => COLORS[name as keyof typeof COLORS] || getAssetColor(name),
            [name]
        )

        // Capitalize the first letter of the name
        const displayName = name.charAt(0).toUpperCase() + name.slice(1)
        const formattedValue = isPrivate ? '•••••' : formatCurrency(Math.round(value))
        const trendColor = trend?.change !== undefined ? (trend?.change > 0 ? 'text-green-500' : trend?.change < 0 ? 'text-red-500' : '') : ''

        return (
            <div
                className={cn(
                    'flex items-center gap-2 py-2 px-3 rounded-lg transition-all duration-300 ease-in-out',
                    isActive
                        ? 'bg-foreground/15 scale-[1.02] shadow-sm'
                        : 'hover:bg-foreground/5 hover:scale-[1.01]'
                )}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                <div
                    className={cn(
                        'w-3 h-3 rounded-md flex-shrink-0 transition-all duration-300',
                        isActive && 'scale-110 shadow-sm'
                    )}
                    style={{ backgroundColor }}
                />
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{displayName}</div>
                    {trend && !isPrivate && (
                        <div className={cn("text-xs font-medium", trendColor)}>
                            {trend.change > 0 ? '↑' : trend.change < 0 ? '↓' : '→'}
                            {Math.abs(trend.change).toFixed(2)}% ({trend.period})
                        </div>
                    )}
                </div>
                <div className="flex flex-col items-end">
                    <div className="text-xs font-medium tabular-nums">{formattedValue}</div>
                    <div className="text-[10px] text-muted-foreground tabular-nums">
                        {isPrivate ? '••' : percentage.toFixed(1)}%
                    </div>
                </div>
            </div>
        )
    }
)

// Legend component
const Legend = memo(({ data, className, activeIndex, onHover, isPrivate }: LegendProps) => (
    <div className={cn('flex flex-col w-full gap-1 p-1 rounded-xl bg-inherit max-w-[250px]', className)}>
        {data.map((item, index) => (
            <LegendItem
                key={item.name}
                {...item}
                isActive={index === activeIndex}
                onMouseEnter={() => onHover(index)}
                onMouseLeave={() => onHover(null)}
                isPrivate={isPrivate}
            />
        ))}
    </div>
))

// Main chart section component
export const ChartSection = memo(
    ({ data, portfolioTotal, onItemClick, isPrivate }: ChartSectionProps) => {
        const [activeIndex, setActiveIndex] = useState<number | null>(null)

        const handleMouseEnter = useCallback((_: unknown, index: number) => {
            setActiveIndex(index)
        }, [])

        const handleMouseLeave = useCallback(() => {
            setActiveIndex(null)
        }, [])

        const handleClick = useCallback(
            (entry: { name: string }) => {
                onItemClick?.(entry.name)
            },
            [onItemClick]
        )

        return (
            <div className="flex flex-col md:flex-row w-full gap-8">
                <div className="w-full md:w-3/5 flex items-center justify-center">
                    <PieChartContent
                        data={data}
                        portfolioTotal={portfolioTotal}
                        activeIndex={activeIndex}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        onClick={handleClick}
                        isPrivate={isPrivate}
                    />
                </div>
                <div className="w-full md:w-2/5 flex items-center justify-center">
                    <Legend
                        data={data}
                        activeIndex={activeIndex}
                        onHover={setActiveIndex}
                        isPrivate={isPrivate}
                    />
                </div>
            </div>
        )
    }
)

// Set display names
ValueDisplay.displayName = 'ValueDisplay'
LegendItem.displayName = 'LegendItem'
Legend.displayName = 'Legend'
PieChartContent.displayName = 'PieChartContent'
ChartSection.displayName = 'ChartSection'

export { Legend, PieChartContent }
