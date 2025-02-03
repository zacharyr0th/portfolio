import {
    createContext,
    useContext,
    useEffect,
    useState,
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
    error: string | null
    lastUpdated: string
    isPrivate: boolean
}

type PortfolioAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string | null }
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

// Optimized provider with memoization
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
    const [error, setError] = useState<Error | null>(null)

    // Remove the duplicate initialization useEffect since we're handling wallet loading in the other useEffect
    useEffect(() => {
        const initializeWalletAccounts = async () => {
            try {
                const wallets = await AccountService.getWalletAccounts()
                const nonWalletAccounts = state.accounts.filter(acc => acc.type !== 'wallet')
                dispatch({
                    type: 'SET_DATA',
                    payload: {
                        accounts: [
                            ...wallets,
                            ...nonWalletAccounts,
                        ],
                    },
                })
            } catch (error) {
                console.error('Failed to initialize wallet accounts:', error)
                dispatch({
                    type: 'SET_ERROR',
                    payload: 'Failed to load wallet accounts',
                })
            }
        }

        initializeWalletAccounts()
    }, [])

    const handleAccountValueUpdate = useCallback((id: string, value: number) => {
        try {
            dispatch({ type: 'UPDATE_ACCOUNT_VALUE', payload: { id, value } })
        } catch (err) {
            logger.error(
                'Error updating account value:',
                err instanceof Error ? err : new Error(String(err))
            )
            setError(err as Error)
        }
    }, [])

    const refreshData = useCallback(async () => {
        try {
            dispatch({ type: 'SET_LOADING', payload: true })
            const walletAccounts = await AccountService.getWalletAccounts()
            const accounts = [
                ...walletAccounts,
                ...AccountService.getBankAccounts(),
                ...AccountService.getBrokerAccounts(),
                ...AccountService.getCexAccounts(),
                ...AccountService.getCreditAccounts(),
            ]

            // Calculate balances from the fresh accounts list
            const balances = accounts.reduce(
                (acc, account) => {
                    acc.total += account.value || 0
                    switch (account.type) {
                        case 'wallet':
                            acc.wallets += account.value || 0
                            break
                        case 'cex':
                            acc.cex += account.value || 0
                            break
                        case 'broker':
                            acc.broker += account.value || 0
                            break
                        case 'bank':
                            acc.bank += account.value || 0
                            break
                        case 'credit':
                            acc.credit += account.value || 0
                            break
                    }
                    return acc
                },
                { total: 0, wallets: 0, cex: 0, broker: 0, bank: 0, credit: 0 }
            )

            dispatch({
                type: 'SET_DATA',
                payload: {
                    currentBalance: balances,
                    accounts,
                    lastUpdated: new Date().toISOString(),
                },
            })
        } catch (err) {
            dispatch({ type: 'SET_ERROR', payload: (err as Error).message })
            setError(err as Error)
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false })
        }
    }, [])

    const copyToClipboard = useCallback(async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
        } catch (err) {
            logger.error(
                'Failed to copy to clipboard:',
                err instanceof Error ? err : new Error(String(err))
            )
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

    const value = useMemo(
        () => ({
            ...state,
            dispatch,
            refreshData,
            copyToClipboard,
            getExplorerLink,
            handleAccountValueUpdate,
            togglePrivacy,
        }),
        [
            state,
            refreshData,
            copyToClipboard,
            getExplorerLink,
            handleAccountValueUpdate,
            togglePrivacy,
        ]
    )

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error loading portfolio data</AlertTitle>
                <p>{error.message}</p>
            </Alert>
        )
    }

    return (
        <ErrorBoundary
            onError={error => {
                logger.error(
                    'Portfolio provider error:',
                    error instanceof Error ? error : new Error(String(error))
                )
                setError(error)
            }}
        >
            <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>
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
