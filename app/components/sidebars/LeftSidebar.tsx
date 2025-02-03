'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Link2, Building2, Wallet, Building } from 'lucide-react'
import { BaseSidebar } from './BaseSidebar'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface SidebarItemProps extends React.HTMLAttributes<HTMLDivElement> {
    icon: React.ReactNode
    label: string
    href: string
    isActive?: boolean
    isOpen?: boolean
}

const SidebarItem = React.forwardRef<HTMLDivElement, SidebarItemProps>(
    ({ className, icon, label, href, isActive, isOpen = true, ...props }, ref) => {
        return (
            <Link href={href}>
                <div
                    ref={ref}
                    className={cn(
                        'flex items-center gap-2 rounded-lg text-sm font-medium hover:bg-accent/50 group',
                        isOpen ? 'px-3 py-2' : 'p-2',
                        isActive && 'bg-accent/50',
                        !isOpen && 'justify-center',
                        className
                    )}
                    {...props}
                >
                    <div
                        className={cn(
                            'transition-all duration-200',
                            isActive
                                ? 'text-foreground'
                                : 'text-muted-foreground group-hover:text-foreground'
                        )}
                    >
                        {icon}
                    </div>
                    {isOpen && (
                        <span
                            className={cn(
                                'truncate transition-all duration-200',
                                isActive
                                    ? 'text-foreground'
                                    : 'text-muted-foreground group-hover:text-foreground'
                            )}
                        >
                            {label}
                        </span>
                    )}
                </div>
            </Link>
        )
    }
)

SidebarItem.displayName = 'SidebarItem'

interface LeftSidebarProps {
    isOpen: boolean
    onToggle: () => void
}

export const LeftSidebar = ({ isOpen, onToggle }: LeftSidebarProps) => {
    const pathname = usePathname()

    return (
        <BaseSidebar isOpen={isOpen} onToggle={onToggle} side="left" label="Navigation">
            <div
                className={cn(
                    'flex flex-col',
                    isOpen ? 'gap-1 px-2 py-1' : 'gap-0.5 px-1 py-0.5',
                    !isOpen && 'items-center'
                )}
            >
                <SidebarItem
                    icon={<LayoutDashboard className="h-4 w-4" />}
                    label="Home"
                    href="/"
                    isActive={pathname === '/'}
                    isOpen={isOpen}
                />
                <SidebarItem
                    icon={<Link2 className="h-[18px] w-[18px]" />}
                    label="Chains"
                    href="/chains"
                    isActive={pathname === '/chains'}
                    isOpen={isOpen}
                />
                <SidebarItem
                    icon={<Building2 className="h-[18px] w-[18px]" />}
                    label="CEX"
                    href="/cex"
                    isActive={pathname === '/cex'}
                    isOpen={isOpen}
                />
                <SidebarItem
                    icon={<Wallet className="h-[18px] w-[18px]" />}
                    label="Brokers"
                    href="/brokers"
                    isActive={pathname === '/brokers'}
                    isOpen={isOpen}
                />
                <SidebarItem
                    icon={<Building className="h-[18px] w-[18px]" />}
                    label="Banks"
                    href="/banks"
                    isActive={pathname === '/banks'}
                    isOpen={isOpen}
                />
            </div>
        </BaseSidebar>
    )
}

LeftSidebar.displayName = 'LeftSidebar'
