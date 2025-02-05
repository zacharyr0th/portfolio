import { memo, useState } from 'react'
import { formatCurrency } from '@/lib/utils/core/format'
import { cn } from '@/lib/utils'
import { EyeOff, Eye, ExternalLink, Copy, Check } from 'lucide-react'
import Link from 'next/link'

interface TokenBalanceProps {
    token: {
        symbol: string
        name?: string
        decimals?: number
        address?: string
    }
    quantity: number
    price?: number
    className?: string
    showPrice?: boolean
    compact?: boolean
    onHide?: () => void
    canHide?: boolean
    isHidden?: boolean
    showHiddenTokens?: boolean
    chainType?: 'aptos' | 'solana' | 'sui'
}

function TokenBalanceComponent({
    token,
    quantity,
    price,
    className,
    showPrice = true,
    compact = false,
    onHide,
    canHide = false,
    isHidden = false,
    showHiddenTokens = false,
    chainType,
}: TokenBalanceProps) {
    const [copied, setCopied] = useState(false)
    const value = price ? quantity * price : 0

    // Check if token is blacklisted
    const isBlacklisted = token.address === '0x3c1d4a86594d681ff7e5d5a233965daeabdc6a15fe5672ceeda5260038857183::vcoins::V<0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::stapt_token::StakedApt>'
    
    // Don't render blacklisted tokens at all
    if (isBlacklisted) return null

    // Check if this is the native token for the chain
    const isNativeToken = chainType && (
        (chainType === 'aptos' && token.symbol.toUpperCase() === 'APT') ||
        (chainType === 'solana' && token.symbol.toUpperCase() === 'SOL') ||
        (chainType === 'sui' && token.symbol.toUpperCase() === 'SUI')
    )

    // Get display symbol for the token
    const getDisplaySymbol = (symbol: string, address?: string) => {
        // Blacklisted tokens - return empty string to hide them
        if (address === '0x3c1d4a86594d681ff7e5d5a233965daeabdc6a15fe5672ceeda5260038857183::vcoins::V<0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::stapt_token::StakedApt>') {
            return ''
        }
        if (symbol.toUpperCase() === 'USDC' && 
            address === '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC') {
            return 'lzUSDC'
        }
        // MKL Tokens
        if (address === '0x878370592f9129e14b76558689a4b570ad22678111df775befbfcbc9fb3d90ab') {
            return 'MKL'
        }
        if (address === '0x5ae6789dd2fec1a9ec9cccfb3acaf12e93d432f0a3a42c92fe1a9d490b7bbc06::mkl_token::MKL') {
            return 'MKL'
        }
        if (address === '0x5ae6789dd2fec1a9ec9cccfb3acaf12e93d432f0a3a42c92fe1a9d490b7bbc06::house_lp::MKLP<0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC>') {
            return 'MKLP'
        }
        if (address === '0x3b5200e090d188c274e06b0d64b3f66638fb996fb0b350499975ff36b1f4595') {
            return 'esMKL'
        }
        // CELL Token
        if (address === '0x2ebb2ccac5e027a87fa0e2e5f656a3a4238d6a48d93ec9b610d570fc0aa0df12') {
            return 'CELL'
        }
        // Amnis stAPT
        if (address === '0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::stapt_token::StakedApt') {
            return 'stAPT'
        }
        return symbol
    }

    // Get display name for the token
    const getDisplayName = (symbol: string, address?: string, name?: string) => {
        if (symbol.toUpperCase() === 'USDC' && 
            address === '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC') {
            return 'LayerZero USDC'
        }
        // MKL Tokens
        if (address === '0x878370592f9129e14b76558689a4b570ad22678111df775befbfcbc9fb3d90ab') {
            return 'MKL (Fungible Asset)'
        }
        if (address === '0x5ae6789dd2fec1a9ec9cccfb3acaf12e93d432f0a3a42c92fe1a9d490b7bbc06::mkl_token::MKL') {
            return 'MKL (Legacy Coin)'
        }
        if (address === '0x5ae6789dd2fec1a9ec9cccfb3acaf12e93d432f0a3a42c92fe1a9d490b7bbc06::house_lp::MKLP<0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC>') {
            return 'MKLP-USDC LP Token'
        }
        if (address === '0x3b5200e090d188c274e06b0d64b3f66638fb996fb0b350499975ff36b1f4595') {
            return 'Escrowed MKL'
        }
        // CELL Token
        if (address === '0x2ebb2ccac5e027a87fa0e2e5f656a3a4238d6a48d93ec9b610d570fc0aa0df12') {
            return 'Cellana Token'
        }
        // Amnis stAPT
        if (address === '0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::stapt_token::StakedApt') {
            return 'Amnis Staked APT'
        }
        return name
    }

    const getExplorerUrl = (symbol: string, address?: string) => {
        if (!address) return null
        switch (symbol.toUpperCase()) {
            case 'APT':
                return `https://explorer.aptoslabs.com/coin/0x1::aptos_coin::AptosCoin?network=mainnet`
            case 'USDC':
                // Check if it's LayerZero USDC
                if (address === '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC') {
                    return `https://explorer.aptoslabs.com/coin/${address}?network=mainnet`
                }
                // Check if it's native Aptos USDC
                if (address === '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b') {
                    return `https://explorer.aptoslabs.com/coin/${address}?network=mainnet`
                }
                return null
            // MKL Tokens
            case 'MKL':
            case 'MKLP':
            case 'ESMKL':
            case 'CELL':
            case 'STAPT':
                return `https://explorer.aptoslabs.com/coin/${address}?network=mainnet`
            case 'SUI':
                return `https://suiscan.xyz/mainnet/account/${address}`
            default:
                return null
        }
    }

    // Smart decimal precision based on token and value
    const getDecimalPrecision = () => {
        const symbol = token.symbol.toUpperCase()
        
        // For very small quantities, show more decimals
        if (quantity < 0.000001) return { min: 8, max: 8 }
        if (quantity < 0.001) return { min: 6, max: 6 }
        if (quantity < 0.1) return { min: 4, max: 4 }
        
        // Token-specific formatting
        switch (symbol) {
            case 'BTC':
                return { min: 6, max: 8 }
            case 'ETH':
                return { min: 4, max: 6 }
            case 'SOL':
            case 'APT':
            case 'SUI':
                return quantity < 1 ? { min: 4, max: 6 } : { min: 2, max: 4 }
            case 'USDC':
            case 'USDT':
            case 'USD':
                return { min: 2, max: 2 }
            default:
                // For values under $1, show more decimals
                if (value < 1) return { min: 2, max: 4 }
                // For regular values, keep it simple
                return { min: 2, max: 2 }
        }
    }

    const { min, max } = getDecimalPrecision()
    const formattedQuantity = quantity.toLocaleString(undefined, {
        minimumFractionDigits: min,
        maximumFractionDigits: max,
        useGrouping: quantity >= 1000,
    })

    const explorerUrl = getExplorerUrl(token.symbol, token.address)

    const handleCopy = () => {
        if (token.address) {
            navigator.clipboard.writeText(token.address)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <div
            className={cn(
                'group grid items-center transition-all duration-200',
                'grid-cols-3 gap-2',
                'px-3 py-1.5',
                isHidden && showHiddenTokens && 'opacity-50',
                isNativeToken && [
                    'bg-accent/[0.04]',
                    'border border-accent/[0.18]',
                    'rounded-md',
                    'shadow-[0_1px_1px_rgba(0,0,0,0.03)]',
                    'hover:bg-accent/[0.09] hover:border-accent/25'
                ].join(' '),
                !isNativeToken && 'hover:bg-accent/10 rounded-sm',
                className
            )}
        >
            {/* Token Info - Left Column */}
            <div className="flex flex-col justify-center min-w-0">
                <div className="flex items-center gap-1">
                    {explorerUrl ? (
                        <>
                            <Link 
                                href={explorerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                    'font-medium leading-none hover:underline inline-flex items-center gap-1', 
                                    compact ? 'text-xs' : 'text-sm',
                                    isNativeToken && 'text-foreground font-semibold'
                                )}
                            >
                                {getDisplaySymbol(token.symbol, token.address)}
                                <ExternalLink className={cn("h-3 w-3", isNativeToken && "text-foreground/70")} />
                            </Link>
                            {token.address && (
                                <button
                                    onClick={handleCopy}
                                    className={cn(
                                        "p-1 rounded-md transition-colors",
                                        isNativeToken ? "hover:bg-accent/30" : "hover:bg-accent"
                                    )}
                                    aria-label={copied ? "Address copied" : "Copy token address"}
                                >
                                    {copied ? (
                                        <Check className="h-3 w-3 text-success" />
                                    ) : (
                                        <Copy className="h-3 w-3 text-muted-foreground" />
                                    )}
                                </button>
                            )}
                        </>
                    ) : (
                        <span className={cn(
                            'font-medium leading-none',
                            compact ? 'text-xs' : 'text-sm',
                            isNativeToken && 'text-foreground font-semibold'
                        )}>
                            {getDisplaySymbol(token.symbol, token.address)}
                        </span>
                    )}
                </div>
                {!compact && (getDisplayName(token.symbol, token.address, token.name)) && (
                    <span className={cn(
                        "text-[10px] transition-colors duration-200 mt-0.5 whitespace-nowrap",
                        isNativeToken ? "text-muted-foreground/70 group-hover:text-foreground/90" : "text-muted-foreground/50 group-hover:text-foreground/90"
                    )}>
                        {getDisplayName(token.symbol, token.address, token.name)}
                    </span>
                )}
            </div>

            {/* Quantity - Middle Column */}
            <div className="flex justify-center">
                <span className={cn(
                    'font-mono leading-none',
                    compact ? 'text-xs' : 'text-sm',
                    isNativeToken ? 'text-foreground/90' : 'text-muted-foreground'
                )}>
                    {formattedQuantity}
                </span>
            </div>

            {/* Value and Actions - Right Column */}
            <div className="flex items-center justify-end gap-2">
                <div className="flex flex-col items-end justify-center">
                    <span className={cn(
                        'font-mono tabular-nums leading-none',
                        compact ? 'text-xs' : 'text-sm',
                        isNativeToken && 'font-medium'
                    )}>
                        {formatCurrency(value, value >= 0.01)}
                    </span>
                    {showPrice && price && price > 0 && !compact && (
                        <span className={cn(
                            "text-[10px] font-mono mt-0.5",
                            isNativeToken ? "text-muted-foreground/70 group-hover:text-foreground/90" : "text-muted-foreground/50 group-hover:text-foreground/90"
                        )}>
                            ${price.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </span>
                    )}
                </div>
                {canHide && onHide && showHiddenTokens && (
                    <button
                        onClick={onHide}
                        className={cn(
                            "opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md",
                            isNativeToken ? "hover:bg-accent/30" : "hover:bg-accent"
                        )}
                        aria-label={isHidden ? "Unhide token" : "Hide token"}
                    >
                        {isHidden ? (
                            <Eye className="h-3 w-3 text-muted-foreground" />
                        ) : (
                            <EyeOff className="h-3 w-3 text-muted-foreground" />
                        )}
                    </button>
                )}
            </div>
        </div>
    )
}

export const TokenBalance = memo(TokenBalanceComponent)
