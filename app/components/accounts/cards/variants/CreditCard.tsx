// React imports
import { memo, useEffect, useState } from 'react'

// Third-party imports
import { Calendar, CreditCard as CreditCardIcon, Wallet } from 'lucide-react'

// Local imports
import { Badge } from '@/app/components/ui/badge'
import type { CreditAccount } from '../types'
import { cn } from '@/lib/utils'
import { BaseCard, cardStyles } from '../BaseCard'
import { ACCOUNT_TYPE_STYLES, PLATFORM_URLS } from '../constants'
import type { CreditPlatform, SharedCardProps } from '../types'

interface CreditCardProps extends Omit<SharedCardProps, 'account'> {
    account: Omit<CreditAccount, 'platform'> & { platform: CreditPlatform }
}

export function CreditCard({ account, compact = false, isExpanded = false }: CreditCardProps) {
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        setIsOpen(isExpanded)
    }, [isExpanded])

    const _platformUrl = PLATFORM_URLS.credit[account.platform]
    const styles = ACCOUNT_TYPE_STYLES[account.type]
    const dueDate = new Date()
    dueDate.setDate(account.dueDate)

    const utilizationRate =
        account.value > 0 ? ((Math.abs(account.value) / account.creditLimit) * 100).toFixed(1) : 0

    return (
        <BaseCard
            account={account}
            expanded={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
            className={isOpen ? 'h-auto' : undefined}
            variant="detailed"
        >
            {!compact && isOpen && (
                <div className="text-xs text-muted-foreground space-y-1.5 sm:space-y-2 mt-2">
                    {/* Status Badges */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className={cn('text-xs', styles.badgeClass)}>
                            {account.cardType}
                        </Badge>
                        {account.autopay && (
                            <Badge
                                variant="secondary"
                                className="bg-green-500/20 text-green-500 text-xs"
                            >
                                Autopay
                            </Badge>
                        )}
                    </div>

                    {/* Credit Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-1">
                        <div className="flex items-center gap-1.5">
                            <Wallet className="h-3 w-3 opacity-50 flex-shrink-0" />
                            <span className="whitespace-nowrap">
                                Limit: ${account.creditLimit.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="whitespace-nowrap">APR: {account.apr}%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 opacity-50 flex-shrink-0" />
                            <span className="whitespace-nowrap">
                                Due:{' '}
                                {dueDate.toLocaleDateString(undefined, {
                                    day: 'numeric',
                                    month: 'short',
                                })}
                            </span>
                        </div>
                        {account.value !== 0 && (
                            <div className="flex items-center gap-1.5">
                                <span className="whitespace-nowrap">Usage: {utilizationRate}%</span>
                            </div>
                        )}
                    </div>

                    {/* Rewards & Additional Info */}
                    {account.rewards && (
                        <div className="border-t border-border/5 pt-1.5">
                            <div className="text-[10px] uppercase text-muted-foreground/50 mb-0.5">
                                Rewards
                            </div>
                            <div className="text-[10px] sm:text-xs">{account.rewards}</div>
                        </div>
                    )}
                </div>
            )}
        </BaseCard>
    )
}
