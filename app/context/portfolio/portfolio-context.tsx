import {
    createContext,
    useContext,
    useEffect,
    ReactNode,
    useCallback,
    useReducer,
    useMemo,
} from 'react'
import {
    AccountService,
} from '@/app/components/accounts'
import { ErrorBoundary } from '@/app/components/ui/error-boundary'
import { Alert, AlertTitle } from '@/app/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import {
    AccountType,
    ChainType,
    PlatformType,
    WalletAccount,
    Account,
} from '@/app/components/accounts/cards/types'
import { logger } from '@/lib/utils/core/logger'

// Add error handling utilities
const createError = (message: string): Error => new Error(message)

// Optimized interfaces
export interface PortfolioDataPoint {
    timestamp: string
    value: number
}

interface PortfolioState {
    currentBalance: {
        total: number
        wallets: number
        cex: number
        broker: number
        bank: number
        credit: number
    }
    allocation: {
        byType: Record<AccountType, number>
        byChain: Record<ChainType, number>
        byPlatform: Record<PlatformType, number>
    }
    accounts: Account[]
    wallets: Record<string, WalletAccount>
    isLoading: boolean
    error: Error | null
    lastUpdated: string
    isPrivate: boolean
}

type PortfolioAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: Error | null }
    | { type: 'SET_DATA'; payload: Partial<PortfolioState> }
    | { type: 'UPDATE_ACCOUNT_VALUE'; payload: { id: string; value: number } }
    | { type: 'TOGGLE_PRIVACY' }
    | { type: 'RESET_STATE' }

const initialState: PortfolioState = {
    currentBalance: {
        total: 0,
        wallets: 0,
        cex: 0,
        broker: 0,
        bank: 0,
        credit: 0,
    },
    allocation: {
        byType: {} as Record<AccountType, number>,
        byChain: {} as Record<ChainType, number>,
        byPlatform: {} as Record<PlatformType, number>,
    },
    accounts: [],
    wallets: {},
    isLoading: false,
    error: null,
    lastUpdated: new Date().toISOString(),
    isPrivate: false,
}

// Optimized reducer with type safety
function portfolioReducer(state: PortfolioState, action: PortfolioAction): PortfolioState {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload }
        case 'SET_ERROR':
            return { ...state, error: action.payload }
        case 'SET_DATA':
            return { ...state, ...action.payload }
        case 'UPDATE_ACCOUNT_VALUE': {
            const { id, value } = action.payload
            const updatedAccounts = state.accounts.map(account =>
                account.id === id
                    ? { ...account, value, lastUpdated: new Date().toISOString() }
                    : account
            )

            const newBalances = updatedAccounts.reduce(
                (acc, account) => {
                    acc.total += account.value
                    switch (account.type) {
                        case 'cex':
                            acc.cex += account.value
                            break
                        case 'wallet':
                            acc.wallets += account.value
                            break
                        case 'broker':
                            acc.broker += account.value
                            break
                        case 'bank':
                            acc.bank += account.value
                            break
                        case 'credit':
                            acc.credit += account.value
                            break
                    }
                    return acc
                },
                { total: 0, cex: 0, wallets: 0, broker: 0, bank: 0, credit: 0 }
            )

            return {
                ...state,
                accounts: updatedAccounts,
                currentBalance: newBalances,
            }
        }
        case 'TOGGLE_PRIVACY':
            return { ...state, isPrivate: !state.isPrivate }
        case 'RESET_STATE':
            return initialState
        default:
            return state
    }
}

interface PortfolioContextType extends PortfolioState {
    dispatch: React.Dispatch<PortfolioAction>
    refreshData: () => Promise<void>
    copyToClipboard: (text: string) => Promise<void>
    getExplorerLink: (account: WalletAccount) => {
        url: string
        name: string
        chain: ChainType
    }
    handleAccountValueUpdate: (id: string, value: number) => void
    togglePrivacy: () => void
}

const PortfolioContext = createContext<PortfolioContextType | null>(null)

const PortfolioErrorFallback = ({ error }: { error: Error }) => (
    <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading portfolio data</AlertTitle>
        <p>{error.message}</p>
    </Alert>
)

export function PortfolioProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(portfolioReducer, {
        ...initialState,
        accounts: [
            ...AccountService.getBankAccounts(),
            ...AccountService.getBrokerAccounts(),
            ...AccountService.getCexAccounts(),
            ...AccountService.getCreditAccounts(),
        ],
    })

    useEffect(() => {
        const initializeWalletAccounts = async () => {
            try {
                dispatch({ type: 'SET_LOADING', payload: true })
                const wallets = await AccountService.getWalletAccounts()
                const nonWalletAccounts = state.accounts.filter(acc => acc.type !== 'wallet')
                dispatch({
                    type: 'SET_DATA',
                    payload: {
                        accounts: [...wallets, ...nonWalletAccounts],
                    },
                })
            } catch (error) {
                const err = error instanceof Error ? error : createError('Failed to load wallet accounts')
                logger.error('Failed to initialize wallet accounts:', err)
                dispatch({
                    type: 'SET_ERROR',
                    payload: err,
                })
            } finally {
                dispatch({ type: 'SET_LOADING', payload: false })
            }
        }

        initializeWalletAccounts()
    }, [])

    const handleAccountValueUpdate = useCallback((id: string, value: number) => {
        try {
            if (!isFinite(value)) {
                logger.warn(`Invalid value for account ${id}:`, { value })
                return
            }

            // Get the current account
            const account = state.accounts.find(a => a.id === id)
            if (!account) {
                logger.warn(`Account not found: ${id}`)
                return
            }

            // Only update if the value has changed significantly (more than 0.01%)
            const currentValue = account.value || 0
            if (Math.abs(value - currentValue) / (currentValue || 1) <= 0.0001) {
                return
            }

            dispatch({ type: 'UPDATE_ACCOUNT_VALUE', payload: { id, value } })
        } catch (err) {
            const error = err instanceof Error ? err : createError('Error updating account value')
            logger.error('Error updating account value:', error)
            dispatch({ type: 'SET_ERROR', payload: error })
        }
    }, [state.accounts])

    const refreshData = useCallback(async () => {
        try {
            dispatch({ type: 'SET_LOADING', payload: true })
            const wallets = await AccountService.getWalletAccounts()
            const nonWalletAccounts = state.accounts.filter(acc => acc.type !== 'wallet')
            dispatch({
                type: 'SET_DATA',
                payload: {
                    accounts: [...wallets, ...nonWalletAccounts],
                    lastUpdated: new Date().toISOString(),
                },
            })
        } catch (err) {
            const error = err instanceof Error ? err : createError('Failed to refresh data')
            logger.error('Error refreshing data:', error)
            dispatch({ type: 'SET_ERROR', payload: error })
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false })
        }
    }, [state.accounts])

    const copyToClipboard = useCallback(async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
        } catch (err) {
            logger.error('Failed to copy to clipboard:', createError(err instanceof Error ? err.message : String(err)))
        }
    }, [])

    const getExplorerLink = useCallback((account: WalletAccount) => {
        const baseUrls: Record<ChainType, string> = {
            aptos: 'https://explorer.aptoslabs.com/account/',
            solana: 'https://solscan.io/account/',
            sui: 'https://suiexplorer.com/address/',
            base: 'https://basescan.org/address/',
        }

        return {
            url: `${baseUrls[account.chain]}${account.publicKey}`,
            name: account.chain,
            chain: account.chain,
        }
    }, [])

    const togglePrivacy = useCallback(() => {
        dispatch({ type: 'TOGGLE_PRIVACY' })
    }, [])

    const contextValue = useMemo(() => ({
        ...state,
        dispatch,
        refreshData,
        copyToClipboard,
        getExplorerLink,
        handleAccountValueUpdate,
        togglePrivacy,
    }), [
        state,
        refreshData,
        copyToClipboard,
        getExplorerLink,
        handleAccountValueUpdate,
        togglePrivacy,
    ])

    // Show error state if there's an error
    if (state.error) {
        return <PortfolioErrorFallback error={state.error} />
    }

    return (
        <ErrorBoundary
            onError={(error) => {
                logger.error('Portfolio provider error:', error)
            }}
        >
            <PortfolioContext.Provider value={contextValue}>
                {children}
            </PortfolioContext.Provider>
        </ErrorBoundary>
    )
}

// Optimized hooks with memoization
export function usePortfolio() {
    const context = useContext(PortfolioContext)
    if (!context) {
        throw new Error('usePortfolio must be used within a PortfolioProvider')
    }
    return context
}

export function usePortfolioValue() {
    const { currentBalance } = usePortfolio()
    return useMemo(() => currentBalance, [currentBalance])
}

export function usePortfolioAccounts() {
    const { accounts } = usePortfolio()
    return useMemo(() => accounts, [accounts])
}
