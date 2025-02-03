import { Button } from '@/app/components/ui/button'
import {
    Search,
    Archive,
    PiggyBank,
    Snowflake,
    X,
    ChevronDown,
    ChevronUp,
    CreditCard,
} from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/app/components/ui/tooltip'
import { Input } from '@/app/components/ui/input'
import type { AccountType } from '@/app/components/accounts/cards/types'
import { memo, useCallback, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

interface AccountNavProps {
    activeFilter: AccountType | 'all'
    onFilterChange: (filter: AccountType | 'all') => void
    counts: Record<AccountType | 'all', number>
    onSearchClick?: () => void
    showRetirement: boolean
    onRetirementChange: (checked: boolean) => void
    showColdStorage: boolean
    onColdStorageChange: (checked: boolean) => void
    showArchived?: boolean
    onArchivedChange?: (checked: boolean) => void
    expandedState?: boolean
    onExpandAll?: (expanded: boolean) => void
    hideCards?: boolean
    onHideCardsChange?: (checked: boolean) => void
}

const FILTER_OPTIONS = [
    { value: 'all', label: 'Accounts' },
    { value: 'wallet', label: 'Wallets' },
    { value: 'cex', label: 'CEX' },
    { value: 'broker', label: 'Brokers' },
    { value: 'bank', label: 'Banks' },
    { value: 'credit', label: 'Credit' },
    { value: 'debit', label: 'Debit' },
] as const

interface ControlButtonProps {
    active: boolean
    onClick: () => void
    icon: React.ReactNode
    tooltip: string
    activeColor?: string
}

const ControlButton = memo(function ControlButton({
    active,
    onClick,
    icon,
    tooltip,
    activeColor = 'blue',
}: ControlButtonProps) {
    const buttonClassName = cn(
        'h-7 w-7 p-0 rounded-full transition-all duration-200',
        active
            ? `text-${activeColor}-500/90 bg-${activeColor}-500/10 hover:bg-${activeColor}-500/15`
            : 'text-foreground/60 hover:bg-foreground/10'
    )

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={onClick} className={buttonClassName}>
                        {icon}
                    </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                    <p>{tooltip}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
})

const FilterButton = memo(function FilterButton({
    option,
    isActive,
    count,
    onClick,
}: {
    option: (typeof FILTER_OPTIONS)[number]
    isActive: boolean
    count: number
    onClick: () => void
}) {
    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            className={cn(
                'h-7 px-2 md:px-2.5 rounded-full transition-all duration-200 shrink-0 text-sm',
                isActive
                    ? 'bg-foreground/10 hover:bg-foreground/15 text-foreground/90'
                    : 'hover:bg-foreground/5 text-foreground/70'
            )}
        >
            <span className="whitespace-nowrap">
                {option.label}
                {count > 0 && (
                    <span className="ml-1 text-xs text-foreground/60">
                        {option.value === 'credit' || option.value === 'debit'
                            ? `[${count}]`
                            : count}
                    </span>
                )}
            </span>
        </Button>
    )
})

function SearchInput({
    onClose,
    onSearch,
}: {
    onClose: () => void
    onSearch: (query: string) => void
}) {
    const [query, setQuery] = useState('')

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setQuery(value)
        onSearch(value)
    }

    return (
        <div className="flex items-center bg-background/50 rounded-full border border-input/50 h-full">
            <Input
                type="search"
                autoComplete="off"
                placeholder="Search..."
                value={query}
                onChange={handleChange}
                className="h-full w-[180px] border-0 focus-visible:ring-0 rounded-l-full bg-transparent px-2.5 text-sm"
                autoFocus
            />
            <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                    onSearch('')
                    onClose()
                }}
                className="h-full w-7 p-0 rounded-r-full hover:bg-foreground/5"
            >
                <X className="h-3.5 w-3.5 text-foreground/60" />
            </Button>
        </div>
    )
}

function AccountNavComponent({
    activeFilter,
    onFilterChange,
    counts,
    showRetirement,
    onRetirementChange,
    showColdStorage,
    onColdStorageChange,
    showArchived = false,
    onArchivedChange,
    expandedState,
    onExpandAll,
    hideCards = false,
    onHideCardsChange,
    onSearch,
}: AccountNavProps & { onSearch: (query: string) => void }) {
    const [isSearching, setIsSearching] = useState(false)

    const handleSearchClose = useCallback(() => {
        setIsSearching(false)
    }, [])

    const filterButtons = useMemo(
        () =>
            FILTER_OPTIONS.filter(
                option =>
                    ((option.value !== 'credit' && option.value !== 'debit') || !hideCards) &&
                    ((option.value !== 'credit' && option.value !== 'debit') ||
                        counts[option.value] > 0)
            ).map(option => (
                <FilterButton
                    key={option.value}
                    option={option}
                    isActive={activeFilter === option.value}
                    count={counts[option.value]}
                    onClick={() => onFilterChange(option.value)}
                />
            )),
        [activeFilter, counts, onFilterChange, hideCards]
    )

    return (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full min-h-[40px]">
            {/* Scrollable filter buttons container */}
            <div className="flex-1 min-w-0 h-9">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none h-full">
                    {filterButtons}
                </div>
            </div>

            {/* Right side controls */}
            <div className="flex items-center gap-1.5 shrink-0 h-9">
                {onExpandAll && (
                    <ControlButton
                        active={!!expandedState}
                        onClick={() => onExpandAll(!expandedState)}
                        icon={
                            expandedState ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                            )
                        }
                        tooltip={
                            expandedState
                                ? 'Collapse all account details'
                                : 'Expand all account details'
                        }
                    />
                )}

                <ControlButton
                    active={!hideCards}
                    onClick={() => onHideCardsChange?.(!hideCards)}
                    icon={<CreditCard className="h-3.5 w-3.5" />}
                    tooltip={
                        hideCards ? 'Show credit and debit cards' : 'Hide credit and debit cards'
                    }
                    activeColor="purple"
                />

                <ControlButton
                    active={showArchived}
                    onClick={() =>
                        onArchivedChange?.(showArchived === undefined ? true : !showArchived)
                    }
                    icon={<Archive className="h-3.5 w-3.5" />}
                    tooltip={showArchived ? 'Hide inactive accounts' : 'Show inactive accounts'}
                    activeColor="zinc"
                />

                <ControlButton
                    active={showRetirement}
                    onClick={() => onRetirementChange(!showRetirement)}
                    icon={<PiggyBank className="h-3.5 w-3.5" />}
                    tooltip={showRetirement ? 'Show all accounts' : 'Show only retirement accounts'}
                    activeColor="green"
                />

                <ControlButton
                    active={showColdStorage}
                    onClick={() => onColdStorageChange(!showColdStorage)}
                    icon={<Snowflake className="h-3.5 w-3.5" />}
                    tooltip={
                        showColdStorage ? 'Show all wallets' : 'Show only cold storage wallets'
                    }
                />

                {/* Search */}
                <div className="relative flex items-center h-7">
                    {isSearching ? (
                        <SearchInput onClose={handleSearchClose} onSearch={onSearch} />
                    ) : (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsSearching(true)}
                            className="h-7 w-7 p-0 rounded-full hover:bg-foreground/5"
                        >
                            <Search className="h-3.5 w-3.5 text-foreground/60" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}

export const AccountNav = memo(AccountNavComponent)

AccountNav.displayName = 'AccountNav'
