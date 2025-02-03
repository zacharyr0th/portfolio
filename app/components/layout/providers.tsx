import { PortfolioProvider } from '@/app/context/portfolio'
// This section already matches the new directory structure - no changes needed
import { LeftSidebar, RightSidebar } from '@/app/components/sidebars'
import { NavBar } from '@/app/components/navbar/navBar'
import { useEffect, useState, useCallback, memo } from 'react'
import { useMediaQuery } from '@/lib/utils/hooks/use-media-query'
import { Toaster } from '@/app/components/ui/toaster'
import { ThemeProvider } from 'next-themes'
import { cn } from '@/lib/utils'

// Optimized interfaces
interface SidebarState {
    isLeftSidebarOpen: boolean
    isRightSidebarOpen: boolean
}

// Optimized components with proper memoization
const MobileOverlay = memo<{
    isVisible: boolean
    onClose: () => void
}>(({ isVisible, onClose }) => {
    if (!isVisible) return null
    return (
        <div
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
            onClick={onClose}
            aria-hidden="true"
        />
    )
})
MobileOverlay.displayName = 'MobileOverlay'

const MainContent = memo<{
    children: React.ReactNode
    isMobile: boolean
    isAnyOpen: boolean
}>(({ children, isMobile, isAnyOpen }) => (
    <main
        className={cn(
            'flex-1 overflow-y-auto min-w-0 relative',
            isAnyOpen && isMobile && 'opacity-40'
        )}
    >
        <div className="max-w-[1800px] mx-auto w-full">{children}</div>
    </main>
))
MainContent.displayName = 'MainContent'

const SidebarWrapper = memo<{
    children: React.ReactNode
    isMobile: boolean
    isOpen: boolean
    side: 'left' | 'right'
}>(({ children, isMobile, isOpen, side }) => (
    <div
        className={cn(
            'z-50 h-full',
            isMobile ? `fixed ${side}-0` : 'relative',
            isMobile && !isOpen && (side === 'left' ? '-translate-x-full' : 'translate-x-full'),
            'transition-transform duration-200'
        )}
    >
        {children}
    </div>
))
SidebarWrapper.displayName = 'SidebarWrapper'

export interface ProvidersProps {
    children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
    const [mounted, setMounted] = useState(false)
    const isMobile = useMediaQuery('(max-width: 768px)')
    const [sidebarState, setSidebarState] = useState<SidebarState>({
        isLeftSidebarOpen: false,
        isRightSidebarOpen: !isMobile,
    })

    const toggleLeftSidebar = useCallback(() => {
        setSidebarState(prev => ({
            ...prev,
            isLeftSidebarOpen: !prev.isLeftSidebarOpen,
        }))
    }, [])

    const toggleRightSidebar = useCallback(() => {
        setSidebarState(prev => ({
            ...prev,
            isRightSidebarOpen: !prev.isRightSidebarOpen,
        }))
    }, [])

    const closeBothSidebars = useCallback(() => {
        setSidebarState({
            isLeftSidebarOpen: false,
            isRightSidebarOpen: false,
        })
    }, [])

    const isAnyOpen = sidebarState.isLeftSidebarOpen || sidebarState.isRightSidebarOpen

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="flex min-h-screen bg-background">
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
                </div>
            </div>
        )
    }

    return (
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <PortfolioProvider>
                <div className="flex flex-col min-h-screen bg-background text-foreground">
                    <NavBar />
                    <div className="flex flex-1 overflow-hidden relative">
                        <SidebarWrapper
                            isMobile={isMobile}
                            isOpen={sidebarState.isLeftSidebarOpen}
                            side="left"
                        >
                            <LeftSidebar
                                isOpen={sidebarState.isLeftSidebarOpen}
                                onToggle={toggleLeftSidebar}
                            />
                        </SidebarWrapper>

                        <MainContent isMobile={isMobile} isAnyOpen={isAnyOpen}>
                            {children}
                        </MainContent>

                        <SidebarWrapper
                            isMobile={isMobile}
                            isOpen={sidebarState.isRightSidebarOpen}
                            side="right"
                        >
                            <RightSidebar
                                isOpen={sidebarState.isRightSidebarOpen}
                                onToggle={toggleRightSidebar}
                            />
                        </SidebarWrapper>

                        <MobileOverlay
                            isVisible={isAnyOpen && isMobile}
                            onClose={closeBothSidebars}
                        />
                    </div>
                    <Toaster />
                </div>
            </PortfolioProvider>
        </ThemeProvider>
    )
}
