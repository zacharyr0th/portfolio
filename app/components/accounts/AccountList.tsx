'use client'

import { useState, useMemo, useCallback } from 'react'
import type { Account, AccountType, WalletAccount } from '@/app/components/accounts/cards/types'
import { AccountCard } from './cards'
import { AccountNav } from './AccountNav'
import { usePortfolio } from '@/app/context/portfolio'
import { cn } from '@/lib/utils'

interface AccountListProps {
    variant?: 'compact' | 'detailed'
    showArchived?: boolean
    allowExpandAll?: boolean
    showSearch?: boolean
    className?: string
}

interface FilterState {
    activeFilter: AccountType | 'all'
    showRetirement: boolean
    showColdStorage: boolean
    showArchived: boolean
    hideCards: boolean
    search: string
}

// Extracted filter logic into a custom hook
function useAccountFilters(initialShowArchived: boolean = false) {
    const [filters, setFilters] = useState<FilterState>({
        activeFilter: 'all',
        showRetirement: false,
        showColdStorage: false,
        showArchived: initialShowArchived,
        hideCards: true,
        search: '',
    })

    const setFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }, [])

    return {
        filters,
        setFilter,
        setActiveFilter: useCallback(
            (value: AccountType | 'all') => setFilter('activeFilter', value),
            [setFilter]
        ),
        setShowRetirement: useCallback(
            (value: boolean) => setFilter('showRetirement', value),
            [setFilter]
        ),
        setShowColdStorage: useCallback(
            (value: boolean) => setFilter('showColdStorage', value),
            [setFilter]
        ),
        setShowArchived: useCallback(
            (value: boolean) => setFilter('showArchived', value),
            [setFilter]
        ),
        setHideCards: useCallback((value: boolean) => setFilter('hideCards', value), [setFilter]),
        setSearch: useCallback((value: string) => setFilter('search', value), [setFilter]),
    }
}

function useAccountCounts(accounts: Account[]) {
    return {
        all: accounts.length,
        wallet: accounts.filter(a => a.type === 'wallet').length,
        cex: accounts.filter(a => a.type === 'cex').length,
        broker: accounts.filter(a => a.type === 'broker').length,
        bank: accounts.filter(a => a.type === 'bank').length,
        credit: accounts.filter(a => a.type === 'credit').length,
        debit: accounts.filter(a => a.type === 'debit').length,
    }
}

export function AccountList({
    variant = 'detailed',
    showArchived = false,
    allowExpandAll = false,
    showSearch = false,
    className,
}: AccountListProps) {
    const [expandedState, setExpandedState] = useState(false)
    const {
        filters,
        setActiveFilter,
        setShowRetirement,
        setShowColdStorage,
        setShowArchived,
        setHideCards,
        setSearch,
    } = useAccountFilters(showArchived)

    const { accounts: portfolioAccounts, handleAccountValueUpdate } = usePortfolio()

    // Memoize the filter function
    const filterAccount = useCallback((account: Account, filters: FilterState) => {
        // Archive filter
        if (account.type === 'wallet') {
            const walletAccount = account as WalletAccount
            if (!filters.showArchived && walletAccount.status === 'inactive') return false
        }

        // Retirement filter
        if (filters.showRetirement && !account.isRetirement) return false

        // Cold storage filter
        if (filters.showColdStorage && account.type === 'wallet' && !account.isColdStorage)
            return false

        // Search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase()
            const hasMatchingPlatform =
                account.type !== 'wallet' && account.platform?.toLowerCase().includes(searchLower)

            return (
                account.name.toLowerCase().includes(searchLower) ||
                hasMatchingPlatform ||
                account.notes?.toLowerCase().includes(searchLower)
            )
        }

        return true
    }, [])

    // Memoize the sort function
    const sortAccounts = useCallback((a: Account, b: Account) => {
        const aValue = Math.abs(a.value)
        const bValue = Math.abs(b.value)

        if (aValue !== bValue) {
            return bValue - aValue
        }

        return a.name.localeCompare(b.name)
    }, [])

    // Filter accounts based on type first
    const typeFilteredAccounts = useMemo(() => {
        if (filters.activeFilter === 'all') {
            return filters.hideCards
                ? portfolioAccounts.filter(a => a.type !== 'credit' && a.type !== 'debit')
                : portfolioAccounts
        }
        return portfolioAccounts.filter(a => a.type === filters.activeFilter)
    }, [portfolioAccounts, filters.activeFilter, filters.hideCards])

    // Then apply additional filters and sort
    const filteredAccounts = useMemo(() => {
        // Apply filters
        const filtered = typeFilteredAccounts.filter(account => filterAccount(account, filters))
        // Sort accounts
        return [...filtered].sort(sortAccounts)
    }, [typeFilteredAccounts, filters, filterAccount, sortAccounts])

    const counts = useAccountCounts(portfolioAccounts)

    const handleSearch = useCallback(
        (query: string) => {
            setSearch(query)
        },
        [setSearch]
    )

    return (
        <div className={cn('w-full flex flex-col gap-4', className)}>
            <AccountNav
                activeFilter={filters.activeFilter}
                onFilterChange={setActiveFilter}
                counts={counts}
                showRetirement={filters.showRetirement}
                onRetirementChange={setShowRetirement}
                showColdStorage={filters.showColdStorage}
                onColdStorageChange={setShowColdStorage}
                showArchived={filters.showArchived}
                onArchivedChange={showArchived ? setShowArchived : undefined}
                expandedState={allowExpandAll ? expandedState : undefined}
                onExpandAll={allowExpandAll ? setExpandedState : undefined}
                hideCards={filters.hideCards}
                onHideCardsChange={setHideCards}
                onSearch={handleSearch}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {filteredAccounts.map((account: Account) => (
                    <AccountCard
                        key={account.id}
                        account={account}
                        compact={variant === 'compact'}
                        isExpanded={allowExpandAll ? expandedState : undefined}
                        onUpdateValue={handleAccountValueUpdate}
                    />
                ))}
            </div>
        </div>
    )
}
