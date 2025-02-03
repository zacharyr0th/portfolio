import { useEffect, useState, useMemo } from 'react'
import { useMediaQuery } from '@/lib/utils/hooks/useMediaQuery'
import { CHART_DIMENSIONS } from './constants'
import type { ChartDimensions } from './types'

export const useChartDimensions = (): ChartDimensions => {
    const isLarge = useMediaQuery('(min-width: 1024px)')
    const isMedium = useMediaQuery('(min-width: 768px)')
    
    return useMemo(() => {
        if (isLarge) return CHART_DIMENSIONS.lg
        if (isMedium) return CHART_DIMENSIONS.md
        return CHART_DIMENSIONS.sm
    }, [isLarge, isMedium])
}

export const useChartAnimation = (isVisible: boolean = true) => {
    const [shouldAnimate, setShouldAnimate] = useState(false)

    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                setShouldAnimate(true)
            }, 100)
            return () => clearTimeout(timer)
        }
        return undefined
    }, [isVisible])

    return shouldAnimate
}

export const useChartInteraction = () => {
    const [activeIndex, setActiveIndex] = useState<number | null>(null)
    const [isHovered, setIsHovered] = useState(false)

    const handleMouseEnter = (index: number) => {
        setActiveIndex(index)
        setIsHovered(true)
    }

    const handleMouseLeave = () => {
        setActiveIndex(null)
        setIsHovered(false)
    }

    return {
        activeIndex,
        isHovered,
        handleMouseEnter,
        handleMouseLeave,
    }
}

export const useChartData = <T extends { value: number }>(
    data: T[],
    sortBy: keyof T = 'value'
) => {
    return useMemo(() => {
        const total = data.reduce((sum, item) => sum + item.value, 0)
        return data
            .map(item => ({
                ...item,
                percentage: total > 0 ? (item.value / total) * 100 : 0,
            }))
            .sort((a, b) => {
                if (typeof a[sortBy] === 'number' && typeof b[sortBy] === 'number') {
                    return (b[sortBy] as number) - (a[sortBy] as number)
                }
                return 0
            })
    }, [data, sortBy])
}
