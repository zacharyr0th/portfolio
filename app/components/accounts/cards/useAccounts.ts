import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { accountConfig, getWalletConfigs } from '@/app/components/accounts/config'
import type { Account, WalletAccount, AccountType } from './types'
import { logger } from '@/lib/utils/core/logger'
import { getInitialAccounts } from '../service'

const MAX_RETRIES = 3
const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

type FilterType = 'all' | 'defi' | 'tradfi' | 'yields' | 'assets'

interface UseAccountsOptions {
    sort?: boolean
    filter?: FilterType
    showArchived?: boolean
}

interface UseAccountsReturn {
    accounts: Account[]
    isLoading: boolean
    error: string | null
    updateAccountValue: (id: string, value: number) => void
    retry: () => void
}

export function useAccounts({
    sort = false,
    filter = 'all',
    showArchived = false,
}: UseAccountsOptions = {}): UseAccountsReturn {
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [retryCount, setRetryCount] = useState(0)
    const [accountValues, setAccountValues] = useState<Record<string, number>>({})
    const [accounts, setAccounts] = useState<Account[]>([])
    const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set())

    // Use refs for values that don't need to trigger re-renders
    const refreshIntervalRef = useRef<NodeJS.Timeout>()
    const isMountedRef = useRef(true)

    // Update account value with validation and error handling
    const updateAccountValue = useCallback((accountId: string, value: number) => {
        if (!isFinite(value)) {
            logger.warn(`Invalid value for account ${accountId}:`, { value })
            return
        }

        setAccountValues(prev => ({
            ...prev,
            [accountId]: value,
        }))

        setPendingUpdates(prev => {
            const next = new Set(prev)
            next.delete(accountId)
            return next
        })
    }, [])

    // Filter accounts based on type with memoization
    const filteredAccounts = useMemo(() => {
        if (filter === 'all') return accounts

        const filterMap: Record<FilterType, (account: Account) => boolean> = {
            defi: account => account.type === 'wallet',
            tradfi: account => ['bank', 'broker', 'credit', 'debit'].includes(account.type),
            yields: account => account.type === 'cex',
            assets: account => ['wallet', 'cex', 'broker'].includes(account.type),
            all: () => true,
        }

        return accounts.filter(filterMap[filter])
    }, [accounts, filter])

    // Filter archived accounts
    const filteredByArchive = useMemo(() => {
        return filteredAccounts.filter(account => {
            if (account.type === 'wallet') {
                const walletAccount = account as WalletAccount
                return showArchived || walletAccount.status !== 'inactive'
            }
            return true
        })
    }, [filteredAccounts, showArchived])

    // Sort accounts with memoization
    const sortedAccounts = useMemo(() => {
        if (!sort) return filteredByArchive

        return [...filteredByArchive].sort((a, b) => {
            const aValue = accountValues[a.id] ?? a.value ?? 0
            const bValue = accountValues[b.id] ?? b.value ?? 0
            return bValue - aValue
        })
    }, [filteredByArchive, sort, accountValues])

    // Retry mechanism with backoff
    const retry = useCallback(() => {
        if (retryCount >= MAX_RETRIES) {
            setError('Maximum retry attempts reached')
            return
        }

        setIsLoading(true)
        setError(null)
        setRetryCount(prev => prev + 1)

        // Reset state and trigger refresh with exponential backoff
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000)
        setTimeout(() => {
            if (isMountedRef.current) {
                setAccountValues({})
                setPendingUpdates(new Set(accounts.map(a => a.id)))
                setIsLoading(false)
            }
        }, backoffDelay)
    }, [retryCount, accounts])

    // Initialize accounts and set up refresh interval
    useEffect(() => {
        const initializeAccounts = async () => {
            try {
                setIsLoading(true)
                setError(null)

                const initialAccounts = await getInitialAccounts()
                const allAccounts = initialAccounts

                if (isMountedRef.current) {
                    // Only set loading to false if we have accounts or explicitly know we should have none
                    setAccounts(allAccounts)
                    setPendingUpdates(new Set(allAccounts.map(a => a.id)))

                    const initialValues: Record<string, number> = {}
                    allAccounts.forEach(account => {
                        initialValues[account.id] = account.value ?? 0
                    })

                    setAccountValues(initialValues)
                    // Set loading to false even if we have no accounts - this is a valid state now
                    setIsLoading(false)
                }
            } catch (err) {
                if (isMountedRef.current) {
                    const errorMessage = err instanceof Error ? err.message : 'Failed to initialize accounts'
                    setError(errorMessage)
                    logger.error('Account initialization error:', err instanceof Error ? err : new Error(String(err)))
                    setIsLoading(false)
                }
            }
        }

        initializeAccounts()

        // Set up refresh interval
        refreshIntervalRef.current = setInterval(() => {
            if (isMountedRef.current) {
                initializeAccounts().catch((err: unknown) => {
                    logger.error('Account refresh error:', err instanceof Error ? err : new Error(String(err)))
                })
            }
        }, REFRESH_INTERVAL)

        return () => {
            isMountedRef.current = false
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current)
            }
        }
    }, [])

    return {
        accounts: sortedAccounts,
        isLoading,
        error,
        updateAccountValue,
        retry,
    }
}
