import { Card } from '@/app/components/ui/card'
import { ChevronDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/core/format'
import { cn } from '@/lib/utils'
import type {
    AccountType,
    ChainType,
    BankPlatform,
    BrokerPlatform,
    CexPlatform,
    CreditPlatform,
    DebitPlatform,
} from '@/app/components/accounts/cards/types'
import type { BaseCardProps } from './types'
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

// Memoize the BaseCard component
export const BaseCard = memo(function BaseCardComponent({
    account,
    expanded,
    onToggle,
    children,
    className,
    variant = 'detailed',
}: BaseCardProps) {
    const { isPrivate } = usePortfolio()
    const { type, name, value } = account
    const styles = ACCOUNT_TYPE_STYLES[type]

    return (
        <Card
            className={cn(
                'relative overflow-hidden transition-all duration-200',
                variant === 'compact' ? 'p-2.5' : 'p-3.5',
                className
            )}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <AccountIcon
                        type={type}
                        chain={'chain' in account ? account.chain : undefined}
                        platform={'platform' in account ? account.platform : undefined}
                        className={cn(
                            'h-6 w-6 md:h-7 md:w-7',
                            variant === 'compact' && 'h-4 w-4 md:h-5 md:w-5'
                        )}
                    />
                    <div>
                        <div
                            className={cn(
                                'font-medium',
                                variant === 'compact'
                                    ? 'text-[10px] md:text-xs'
                                    : 'text-xs md:text-sm'
                            )}
                        >
                            {name}
                        </div>
                        {variant === 'detailed' && (
                            <div className="text-xs text-muted-foreground">{styles.label}</div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2.5">
                    <div className="text-right">
                        <div
                            className={cn(
                                'font-mono font-medium tabular-nums',
                                variant === 'compact'
                                    ? 'text-xs md:text-sm'
                                    : 'text-sm md:text-base'
                            )}
                        >
                            {isPrivate ? '•••••' : formatCurrency(value)}
                        </div>
                        {variant === 'detailed' && (
                            <div className="text-xs text-muted-foreground">Balance</div>
                        )}
                    </div>
                    {children && (
                        <button
                            onClick={onToggle}
                            className="p-0.5 hover:bg-accent rounded-md transition-colors"
                            aria-label={expanded ? 'Collapse' : 'Expand'}
                        >
                            <ChevronDown
                                className={cn(
                                    'h-4 w-4 transition-transform duration-200',
                                    expanded && 'rotate-180'
                                )}
                            />
                        </button>
                    )}
                </div>
            </div>
            {children && (
                <div
                    className={cn(
                        'transition-all duration-200 overflow-hidden',
                        expanded ? 'max-h-[800px] opacity-100 mt-3' : 'max-h-0 opacity-0'
                    )}
                >
                    {children}
                </div>
            )}
        </Card>
    )
})
