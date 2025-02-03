'use client'

import { Button } from '@/app/components/ui/button'
import { ScrollArea } from '@/app/components/ui/scroll-area'
import { Card } from '@/app/components/ui/card'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { BaseSidebarProps } from './types'
import { sidebarAnimation, SIDEBAR_WIDTHS } from './constants'
import { useLayoutEffect, useCallback, useMemo, memo } from 'react'
import { useMediaQuery } from '@/lib/utils/hooks/use-media-query'
import React from 'react'

interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
}

interface SidebarFooterContentProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
}

interface SidebarFooterSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
}

interface SidebarFooterActionsProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
}

interface SidebarFooterButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode
}

interface SidebarFooterLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    children: React.ReactNode
}

interface SidebarRootProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
}

interface SidebarContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
}

interface SidebarWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
}

interface SidebarInnerProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
}

interface SidebarScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
}

interface SidebarFooterProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
}

interface SidebarFooterContentProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
}

interface SidebarFooterSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
}

interface SidebarFooterActionsProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
}

interface SidebarFooterButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode
}

interface SidebarFooterLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    children: React.ReactNode
}

export type {
    SidebarRootProps,
    SidebarContainerProps,
    SidebarWrapperProps,
    SidebarInnerProps,
    SidebarScrollAreaProps,
    SidebarFooterProps,
    SidebarFooterContentProps,
    SidebarFooterSeparatorProps,
    SidebarFooterActionsProps,
    SidebarFooterButtonProps,
    SidebarFooterLinkProps,
}

const LeftChevron = memo(() => <ChevronLeft className="h-4 w-4" />)
LeftChevron.displayName = 'LeftChevron'

const RightChevron = memo(() => <ChevronRight className="h-4 w-4" />)
RightChevron.displayName = 'RightChevron'

const MobileLeftChevron = memo(() => <ChevronLeft className="h-5 w-5" />)
MobileLeftChevron.displayName = 'MobileLeftChevron'

const MobileRightChevron = memo(() => <ChevronRight className="h-5 w-5" />)
MobileRightChevron.displayName = 'MobileRightChevron'

const DesktopToggleButton = memo(
    ({
        isOpen,
        onToggle,
        isLeft,
        label,
        className,
    }: {
        isOpen: boolean
        onToggle: () => void
        isLeft: boolean
        label: string
        className: string
    }) => (
        <Button
            variant="ghost"
            size="icon"
            className={className}
            onClick={onToggle}
            aria-label={isOpen ? `Close ${label}` : `Open ${label}`}
            aria-expanded={isOpen}
        >
            <div
                className={cn(
                    'text-muted-foreground/50 group-hover:text-muted-foreground transition-all duration-200',
                    isOpen ? 'rotate-0' : 'rotate-180'
                )}
            >
                {isLeft ? <LeftChevron /> : <RightChevron />}
            </div>
        </Button>
    )
)
DesktopToggleButton.displayName = 'DesktopToggleButton'

const MobileToggleButton = memo(
    ({
        isOpen,
        onToggle,
        isLeft,
        label,
        className,
    }: {
        isOpen: boolean
        onToggle: () => void
        isLeft: boolean
        label: string
        className: string
    }) => (
        <Button
            variant="secondary"
            size="icon"
            className={className}
            onClick={onToggle}
            aria-label={isOpen ? `Close ${label}` : `Open ${label}`}
        >
            {isLeft ? (
                isOpen ? (
                    <MobileLeftChevron />
                ) : (
                    <MobileRightChevron />
                )
            ) : isOpen ? (
                <MobileRightChevron />
            ) : (
                <MobileLeftChevron />
            )}
        </Button>
    )
)
MobileToggleButton.displayName = 'MobileToggleButton'

// Memoized content area
const SidebarContent = React.forwardRef<HTMLDivElement, { children: React.ReactNode }>(
    ({ children }, ref) => (
        <ScrollArea className="flex-1 h-[calc(100vh-2.75rem)]" type="hover" ref={ref}>
            <div>{children}</div>
        </ScrollArea>
    )
)

SidebarContent.displayName = 'SidebarContent'

function BaseSidebarComponent({
    isOpen,
    onToggle,
    side,
    width = SIDEBAR_WIDTHS.default,
    mdWidth = SIDEBAR_WIDTHS.md,
    mobileWidth = SIDEBAR_WIDTHS.mobile,
    children,
    label,
    className,
}: BaseSidebarProps) {
    const isLeft = side === 'left'
    const isMobile = useMediaQuery('(max-width: 768px)')

    // Memoize the width update function
    const updateWidth = useCallback(() => {
        const root = document.documentElement
        const isMobile = window.innerWidth < 768
        const isTablet = window.innerWidth < 1024
        requestAnimationFrame(() => {
            root.style.setProperty(
                '--sidebar-width',
                isMobile ? mobileWidth : isTablet ? mdWidth : width
            )
            root.style.setProperty('--sidebar-width-closed', SIDEBAR_WIDTHS.collapsed)
        })
    }, [width, mdWidth, mobileWidth])

    useLayoutEffect(() => {
        updateWidth()
        const debouncedResize = debounce(updateWidth, 100)
        window.addEventListener('resize', debouncedResize)
        return () => window.removeEventListener('resize', debouncedResize)
    }, [updateWidth])

    // Memoize static styles and classes
    const containerClasses = useMemo(
        () =>
            cn(
                'relative h-screen',
                isMobile
                    ? 'w-screen'
                    : isOpen
                      ? 'w-[var(--sidebar-width)]'
                      : 'w-[var(--sidebar-width-closed)]',
                className
            ),
        [isMobile, isOpen, className]
    )

    const desktopButtonClasses = useMemo(
        () =>
            cn(
                'absolute z-50',
                'h-16 w-4',
                'bg-background hover:bg-background',
                'border-y border-border/50',
                isLeft
                    ? 'right-0 translate-x-full top-8 rounded-r-lg border-r border-l-0'
                    : 'left-0 -translate-x-full top-8 rounded-l-lg border-l border-r-0',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                'touch-manipulation transition-colors duration-200',
                'flex items-center justify-center',
                'shadow-sm hover:shadow-md',
                'group',
                !isOpen && (isLeft ? '-right-4' : '-left-4')
            ),
        [isLeft, isOpen]
    )

    const mobileButtonClasses = useMemo(
        () =>
            cn(
                'fixed z-50',
                'h-12 w-12',
                'bg-background/95',
                'border border-border/50',
                'rounded-full',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'touch-manipulation transition-colors duration-200',
                'flex items-center justify-center',
                'backdrop-blur-sm shadow-md hover:shadow-lg',
                'group',
                'top-1/2 -translate-y-1/2',
                isLeft ? (isOpen ? 'right-4' : '-right-6') : isOpen ? 'left-4' : '-left-6'
            ),
        [isLeft, isOpen]
    )

    const cardClasses = useMemo(
        () =>
            cn(
                'h-full overflow-hidden rounded-none',
                isLeft ? 'border-r' : 'border-l',
                'shadow-lg',
                'touch-manipulation will-change-transform',
                isMobile ? 'fixed top-0 bottom-0 bg-background/90 backdrop-blur-md' : 'bg-inherit',
                isMobile && 'border-0'
            ),
        [isLeft, isMobile]
    )

    // Memoize card style to prevent unnecessary recalculations
    const cardStyle = useMemo(
        () => ({
            width: isOpen ? 'var(--sidebar-width)' : 'var(--sidebar-width-closed)',
            transform: `translate3d(${isLeft ? 0 : 'auto'}, 0, 0)`,
            right: !isLeft ? 0 : 'auto',
            willChange: 'transform, width',
        }),
        [isOpen, isLeft]
    )

    return (
        <div className={containerClasses}>
            {!isMobile && (
                <DesktopToggleButton
                    isOpen={isOpen}
                    onToggle={onToggle}
                    isLeft={isLeft}
                    label={label}
                    className={desktopButtonClasses}
                />
            )}

            {isMobile && (
                <MobileToggleButton
                    isOpen={isOpen}
                    onToggle={onToggle}
                    isLeft={isLeft}
                    label={label}
                    className={mobileButtonClasses}
                />
            )}

            <Card
                className={cn(cardClasses, 'transition-all duration-200 ease-in-out')}
                style={cardStyle}
            >
                <div className={cn('flex flex-col h-full transition-all duration-200')}>
                    <div className="flex-none h-4" />
                    <SidebarContent>{children}</SidebarContent>
                </div>
            </Card>
        </div>
    )
}

// Memoize the entire component
export const BaseSidebar = memo(BaseSidebarComponent)

// Utility function for debouncing resize events
function debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => fn(...args), delay)
    }
}

export const SidebarHeader = React.forwardRef<HTMLDivElement, SidebarHeaderProps>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('flex items-center justify-between p-4', className)}
            {...props}
        />
    )
)

SidebarHeader.displayName = 'SidebarHeader'

export const SidebarFooterContent = React.forwardRef<HTMLDivElement, SidebarFooterContentProps>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('flex items-center justify-between p-4', className)}
            {...props}
        />
    )
)

SidebarFooterContent.displayName = 'SidebarFooterContent'

export const SidebarFooterSeparator = React.forwardRef<HTMLDivElement, SidebarFooterSeparatorProps>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('h-px bg-border', className)} {...props} />
    )
)

SidebarFooterSeparator.displayName = 'SidebarFooterSeparator'

export const SidebarFooterActions = React.forwardRef<HTMLDivElement, SidebarFooterActionsProps>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('flex items-center gap-4 p-4', className)} {...props} />
    )
)

SidebarFooterActions.displayName = 'SidebarFooterActions'

export const SidebarFooterButton = React.forwardRef<HTMLButtonElement, SidebarFooterButtonProps>(
    ({ className, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
                    className
                )}
                {...props}
            />
        )
    }
)

SidebarFooterButton.displayName = 'SidebarFooterButton'

export const SidebarFooterLink = React.forwardRef<HTMLAnchorElement, SidebarFooterLinkProps>(
    ({ className, ...props }, ref) => {
        return (
            <a
                ref={ref}
                className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
                    className
                )}
                {...props}
            />
        )
    }
)

SidebarFooterLink.displayName = 'SidebarFooterLink'

export const SidebarRoot = React.forwardRef<HTMLDivElement, SidebarRootProps>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('relative', className)} {...props} />
    )
)
SidebarRoot.displayName = 'SidebarRoot'

export const SidebarContainer = React.forwardRef<HTMLDivElement, SidebarContainerProps>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('flex h-screen', className)} {...props} />
    )
)

SidebarContainer.displayName = 'SidebarContainer'

export const SidebarWrapper = React.forwardRef<HTMLDivElement, SidebarWrapperProps>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('h-full w-full', className)} {...props} />
    )
)

SidebarWrapper.displayName = 'SidebarWrapper'

export const SidebarInner = React.forwardRef<HTMLDivElement, SidebarInnerProps>(
    ({ className, ...props }, ref) => {
        return <div ref={ref} className={cn('relative h-full w-full', className)} {...props} />
    }
)

SidebarInner.displayName = 'SidebarInner'

export const SidebarScrollArea = React.forwardRef<HTMLDivElement, SidebarScrollAreaProps>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('h-full overflow-auto', className)} {...props} />
    )
)

SidebarScrollArea.displayName = 'SidebarScrollArea'

export const SidebarFooter = React.forwardRef<HTMLDivElement, SidebarFooterProps>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('mt-auto', className)} {...props} />
    )
)

SidebarFooter.displayName = 'SidebarFooter'
