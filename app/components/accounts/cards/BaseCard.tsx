import { Card } from '@/app/components/ui/card'
import { ChevronDown } from 'lucide-react'
import { formatCurrency, formatRelativeTime } from '@/lib/utils/core/format'
import { cn } from '@/lib/utils'
import type {
    AccountType,
    ChainType,
    BankPlatform,
    BrokerPlatform,
    CexPlatform,
    CreditPlatform,
    DebitPlatform,
    BaseAccount,
} from '@/app/components/accounts/cards/types'
import { ACCOUNT_TYPE_STYLES } from './constants'
import { memo } from 'react'
import { Icon } from './Icon'
import { getChainIcon, getPlatformIcon } from './constants'
import { usePortfolio } from '@/app/context/portfolio'

interface AccountIconProps {
    type: AccountType
    chain?: ChainType
    platform?: BankPlatform | BrokerPlatform | CexPlatform | CreditPlatform | DebitPlatform
    className?: string
}

const AccountIcon = memo(function AccountIconComponent({
    type,
    chain,
    platform,
    className,
}: AccountIconProps) {
    // Handle wallet with chain
    if (type === 'wallet' && chain) {
        const chainIcon = getChainIcon(chain)
        if (chainIcon) {
            return (
                <Icon
                    type="image"
                    src={chainIcon.src}
                    alt={`${chain} chain icon`}
                    opacity={chainIcon.opacity}
                    icon={type}
                    className={className}
                />
            )
        }
    }

    // Handle platform-specific icon
    if (platform) {
        const platformIcon = getPlatformIcon(platform)
        if (platformIcon) {
            return (
                <Icon
                    type="image"
                    src={platformIcon.src}
                    alt={`${platform} platform icon`}
                    opacity={platformIcon.opacity}
                    icon={type}
                    className={className}
                />
            )
        }
    }

    // Fallback to account type icon with consistent styling
    return <Icon type="account" icon={type} className={className} />
})

AccountIcon.displayName = 'AccountIcon'

interface BalanceTableProps {
    balances: Array<{
        token?: { symbol: string; name?: string }
        quantity: number | string
        price?: number
        value: number
    }>
    showPrice?: boolean
}

const BalanceTable = memo(function BalanceTable({ balances, showPrice = true }: BalanceTableProps) {
    if (!balances?.length) return null

    return (
        <div className="w-full mt-3">
            <div className="grid grid-cols-[1fr,auto] gap-x-4 gap-y-1.5">
                {balances.map((balance, idx) => (
                    <div key={idx} className="contents text-sm">
                        <div className="flex items-center gap-2">
                            <span className="font-medium">
                                {balance.token?.symbol || 'Balance'}
                            </span>
                            <span className="text-muted-foreground">
                                {formatCurrency(Number(balance.quantity), false)}
                            </span>
                        </div>
                        <div className="text-right text-muted-foreground">
                            {showPrice && balance.price && (
                                <span className="mr-3">
                                    $
                                    {balance.price.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </span>
                            )}
                            <span>
                                $
                                {balance.value.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
})

BalanceTable.displayName = 'BalanceTable'

// Shared styles for consistent card content
export const cardStyles = {
    badge: 'px-1 py-0.5 rounded-full text-[11px]',
    label: 'font-medium min-w-[3.5rem]',
    content: 'text-[11px] text-muted-foreground space-y-1 mt-2',
    row: 'flex items-center gap-1',
    code: 'font-mono bg-muted px-1 rounded text-[11px]',
    icon: 'h-3 w-3',
    statusBadge: (status: string) =>
        cn(
            'px-1 py-0.5 rounded-full text-[11px]',
            status === 'connected'
                ? 'bg-success/20 text-success'
                : status === 'pending'
                  ? 'bg-warning/20 text-warning'
                  : 'bg-destructive/20 text-destructive'
        ),
} as const

interface LoadingProps {
    className?: string
}

const Loading = memo(function Loading({ className }: LoadingProps) {
    return (
        <div className={cn('space-y-2 animate-pulse', className)}>
            <div className="h-2 bg-muted rounded w-24" />
            <div className="h-2 bg-muted rounded w-32" />
            <div className="h-2 bg-muted rounded w-28" />
        </div>
    )
})

interface ErrorProps {
    message: string
    className?: string
}

const Error = memo(function Error({ message, className }: ErrorProps) {
    return (
        <div className={cn('p-2 rounded-lg bg-destructive/10 text-destructive text-sm', className)}>
            {message}
        </div>
    )
})

interface BaseCardProps {
    account: BaseAccount & {
        chain?: ChainType
        platform?: BankPlatform | BrokerPlatform | CexPlatform | CreditPlatform | DebitPlatform
    }
    expanded?: boolean
    onToggle?: () => void
    children?: React.ReactNode
    className?: string
    variant?: 'detailed' | 'compact'
    isLoading?: boolean
    error?: string | null
    lastUpdated?: number
}

export const BaseCard = memo(function BaseCardComponent({
    account,
    expanded = false,
    onToggle,
    children,
    className,
    variant = 'detailed',
    isLoading = false,
    error = null,
    lastUpdated,
}: BaseCardProps) {
    const { isPrivate } = usePortfolio()
    const { type, name, value } = account
    const styles = ACCOUNT_TYPE_STYLES[type]
    const isCompact = variant === 'compact'

    return (
        <Card
            className={cn(
                'relative overflow-hidden transition-all duration-200',
                isCompact ? 'p-2' : 'p-3',
                styles.bgColor,
                className
            )}
        >
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <AccountIcon
                            type={type}
                            chain={'chain' in account ? account.chain : undefined}
                            platform={'platform' in account ? account.platform : undefined}
                            className={cn(
                                'flex-shrink-0',
                                isCompact ? 'h-5 w-5' : 'h-6 w-6'
                            )}
                        />
                        <div className="min-w-0">
                            <div
                                className={cn(
                                    'font-medium truncate',
                                    isCompact ? 'text-xs' : 'text-sm'
                                )}
                            >
                                {name}
                            </div>
                            {!isCompact && (
                                <div className="text-xs text-muted-foreground truncate">{styles.label}</div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-right">
                            <div
                                className={cn(
                                    'font-mono font-medium tabular-nums',
                                    isCompact ? 'text-xs' : 'text-sm'
                                )}
                            >
                                {isPrivate ? '•••••' : formatCurrency(value)}
                            </div>
                            {!isCompact && (
                                <div className="text-xs text-muted-foreground">Balance</div>
                            )}
                        </div>
                        {onToggle && (
                            <button
                                onClick={onToggle}
                                className="p-1 hover:bg-accent rounded-md transition-colors"
                                aria-label={expanded ? 'Collapse' : 'Expand'}
                            >
                                <ChevronDown
                                    className={cn(
                                        'h-4 w-4 text-muted-foreground transition-transform duration-200',
                                        expanded && 'rotate-180'
                                    )}
                                />
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                {expanded && (
                    <div className="mt-3">
                        {isLoading ? (
                            <Loading />
                        ) : error ? (
                            <Error message={error} />
                        ) : (
                            children
                        )}
                    </div>
                )}

                {/* Footer */}
                {!isCompact && (
                    <div className="mt-auto pt-3">
                        <div className="border-t border-border" />
                        <div className="pt-3 text-xs text-muted-foreground/60">
                            {lastUpdated ? (
                                `Updated ${new Date(lastUpdated).toLocaleTimeString(undefined, {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                })}`
                            ) : (
                                'Not yet updated'
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    )
})
