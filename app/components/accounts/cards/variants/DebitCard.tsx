import { useEffect, useState } from 'react'
import { Badge } from '@/app/components/ui/badge'
import type { DebitAccount } from '../types'
import { BaseCard } from '../BaseCard'
import type { SharedCardProps } from '../types'
import { PLATFORM_URLS } from '../constants'
import type { DebitPlatform } from '../types'

interface DebitCardProps extends Omit<SharedCardProps, 'account'> {
    account: Omit<DebitAccount, 'platform'> & { platform: DebitPlatform }
}

export function DebitCard({ account, compact = false, isExpanded = false }: DebitCardProps) {
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        setIsOpen(isExpanded)
    }, [isExpanded])

    const _platformUrl = PLATFORM_URLS.debit[account.platform]

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
                    {/* Card Type Badge */}
                    <Badge variant="secondary" className="text-xs">
                        {account.cardType}
                    </Badge>

                    {/* Card Info */}
                    {account.accountNumber && (
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className="font-medium min-w-[4.5rem]">Card:</span>
                            <code className="font-mono bg-muted px-1 rounded text-[10px] sm:text-xs">
                                ****{account.accountNumber.slice(-4)}
                            </code>
                        </div>
                    )}
                </div>
            )}
        </BaseCard>
    )
}
