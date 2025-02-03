// React imports
import { useEffect, useState } from 'react'

// Third-party imports
import { Briefcase } from 'lucide-react'

// Local imports
import { Badge } from '@/app/components/ui/badge'
import type { BrokerAccount } from '../types'
import { cn } from '@/lib/utils'
import { BaseCard, cardStyles } from '../BaseCard'
import { ACCOUNT_TYPE_STYLES, CATEGORY_DESCRIPTIONS, PLATFORM_URLS } from '../constants'
import type { BrokerPlatform, SharedCardProps } from '../types'

interface BrokerCardProps extends Omit<SharedCardProps, 'account'> {
    account: Omit<BrokerAccount, 'platform'> & { platform: BrokerPlatform }
}

export function BrokerCard({ account, compact = false, isExpanded = false }: BrokerCardProps) {
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        setIsOpen(isExpanded)
    }, [isExpanded])

    const _platformUrl = PLATFORM_URLS.broker[account.platform]
    const styles = ACCOUNT_TYPE_STYLES[account.type]

    // Format balances for the table
    const balances =
        account.positions?.map(position => ({
            token: { symbol: position.symbol, name: position.name },
            quantity: position.quantity,
            price: position.price,
            value: position.quantity * position.price,
        })) || []

    if (account.cash && account.cash > 0) {
        balances.push({
            token: { symbol: 'USD', name: 'US Dollar' },
            quantity: account.cash,
            price: 1,
            value: account.cash,
        })
    }

    return (
        <BaseCard
            account={account}
            expanded={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
            className={isOpen ? 'h-auto' : undefined}
            variant="detailed"
        >
            {!compact && isOpen && (
                <div className={cardStyles.content}>
                    <div className="flex flex-wrap items-center gap-1">
                        <Badge
                            variant="secondary"
                            className={cn(cardStyles.badge, styles.badgeClass)}
                        >
                            {account.category}
                        </Badge>
                        {account.isRetirement && (
                            <Badge
                                variant="secondary"
                                className={cn(cardStyles.badge, 'bg-blue-500/20 text-blue-500')}
                            >
                                Retirement
                            </Badge>
                        )}
                    </div>

                    <div className="flex flex-col gap-1">
                        <div className={cardStyles.row}>
                            <Briefcase className={cardStyles.icon + ' opacity-50 flex-shrink-0'} />
                            <span>{CATEGORY_DESCRIPTIONS[account.category]}</span>
                        </div>
                        {account.notes && (
                            <div className={cardStyles.row}>
                                <span className="opacity-60 pl-4">{account.notes}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </BaseCard>
    )
}
