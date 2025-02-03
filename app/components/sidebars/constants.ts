import { AnimationConfig } from './types'

export const Z_INDICES = {
    navbar: 100,
    sidebarToggle: 90,
    sidebar: 80,
    mobileButton: 85,
} as const

export const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.015,
            delayChildren: 0.03,
            duration: 0.12,
            ease: 'easeOut',
        },
    },
} as const

export const item = {
    hidden: { opacity: 0, x: -3 },
    show: {
        opacity: 1,
        x: 0,
        transition: {
            type: 'spring',
            stiffness: 600,
            damping: 45,
            mass: 0.8,
            duration: 0.12,
        },
    },
} as const

export const sidebarAnimation: AnimationConfig = {
    initial: {
        width: 0,
        opacity: 0,
        x: 0,
        willChange: 'transform, opacity, width',
    },
    animate: {
        width: 'var(--sidebar-width)',
        opacity: 1,
        x: 0,
    },
    exit: {
        width: 0,
        opacity: 0,
        x: 0,
    },
    transition: {
        type: 'spring',
        stiffness: 500,
        damping: 45,
        mass: 0.8,
        opacity: {
            duration: 0.12,
            ease: 'easeOut',
        },
    },
} as const

export const SIDEBAR_WIDTHS = {
    mobile: '85vw',
    default: '260px',
    md: '260px',
    sm: '260px',
    collapsed: '48px',
} as const
