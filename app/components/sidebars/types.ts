import { LucideIcon } from 'lucide-react'
import { SIDEBAR_WIDTHS, Z_INDICES } from './constants'

export type SidebarWidth = keyof typeof SIDEBAR_WIDTHS
export type ZIndex = keyof typeof Z_INDICES
export type SidebarSide = 'left' | 'right'

export interface BaseSidebarProps {
    isOpen: boolean
    onToggle: () => void
    side: SidebarSide
    width?: string
    mdWidth?: string
    mobileWidth?: string
    children: React.ReactNode
    label: string
    className?: string
}

export interface SidebarProps extends Pick<BaseSidebarProps, 'isOpen' | 'onToggle' | 'className'> {}

export interface NavButtonProps {
    icon: LucideIcon
    label: string
    href: string
    index?: number
    className?: string
}

export interface MarketItemProps {
    label: string
    value: string
    change: string
    isPositive: boolean
    index?: number
    className?: string
}

export interface MarketSectionProps {
    title: string
    children: React.ReactNode
    className?: string
}

export interface AnimationConfig {
    initial: {
        width: number | string
        opacity: number
        x: number
        willChange?: string
    }
    animate: {
        width: string
        opacity: number
        x: number
    }
    exit?: {
        width: number
        opacity: number
        x: number
    }
    transition?: {
        type: string
        stiffness: number
        damping: number
        mass: number
        opacity?: {
            duration: number
            ease: string
        }
    }
}
