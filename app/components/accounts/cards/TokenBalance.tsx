import { memo, useMemo, useCallback } from "react";
import { formatCurrency } from "@/lib/utils/core/format";
import { cn } from "@/lib/utils";
import { EyeOff, Eye, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ChainType } from "@/lib/chains/constants";
import { CHAIN_CONFIG } from "@/lib/chains/constants";

// Add scrollbar hiding CSS
const hideScrollbarClass = [
  "scrollbar-none",
  "[&::-webkit-scrollbar]",
  "overflow-y-auto",
  "hover:scrollbar-none",
].join(" ");

// Format large numbers to K/M/B format with 2 decimal places
function formatLargeNumber(num: number): string {
  const absNum = Math.abs(num);
  if (absNum >= 1e9) {
    return (num / 1e9).toFixed(2) + "B";
  } else if (absNum >= 1e6) {
    return (num / 1e6).toFixed(2) + "M";
  } else if (absNum >= 1e3) {
    return (num / 1e3).toFixed(2) + "K";
  } else if (absNum < 0.01) {
    return "< 0.01";
  } else {
    return num.toFixed(2);
  }
}

// Smart decimal precision based on token and value
function getDecimalPrecision(
  symbol: string,
  quantity: number,
  value: number,
  chainType?: ChainType,
): { min: number; max: number } {
  // For very small quantities, show more decimals
  if (quantity < 0.000001) return { min: 8, max: 8 };
  if (quantity < 0.001) return { min: 6, max: 6 };
  if (quantity < 0.1) return { min: 4, max: 4 };

  // Handle stablecoins consistently
  if (["USDC", "USDT", "USD", "DAI"].includes(symbol.toUpperCase())) {
    return { min: 2, max: 2 };
  }

  // Handle native tokens based on chain type
  if (chainType) {
    const isNativeToken =
      (chainType === "aptos" && symbol.toUpperCase() === "APT") ||
      (chainType === "solana" && symbol.toUpperCase() === "SOL") ||
      (chainType in CHAIN_CONFIG &&
        CHAIN_CONFIG[chainType as keyof typeof CHAIN_CONFIG]?.nativeCurrency
          .symbol === symbol.toUpperCase());

    if (isNativeToken) {
      return quantity < 1 ? { min: 4, max: 6 } : { min: 2, max: 4 };
    }
  }

  // For values under $1, show more decimals
  if (value < 1) return { min: 2, max: 4 };
  // For regular values, keep it simple
  return { min: 2, max: 2 };
}

interface TokenBalanceProps {
  token: {
    symbol: string;
    name: string;
    decimals: number;
    address?: string;
  };
  quantity: number;
  price?: number;
  showPrice?: boolean;
  compact?: boolean;
  canHide?: boolean;
  onHide?: () => void;
  isHidden?: boolean;
  showHiddenTokens?: boolean;
  chainType?: ChainType;
  className?: string;
}

// Memoize formatting functions
const formatters = new Map<string, Intl.NumberFormat>();

const getFormatter = (min: number, max: number): Intl.NumberFormat => {
  const key = `${min}-${max}`;
  if (!formatters.has(key)) {
    formatters.set(
      key,
      new Intl.NumberFormat(undefined, {
        minimumFractionDigits: min,
        maximumFractionDigits: max,
        useGrouping: true,
      }),
    );
  }
  return formatters.get(key)!;
};

// Helper functions moved to the top level
const getDisplaySymbol = (symbol: string, address?: string): string => {
  // Blacklisted tokens - return empty string to hide them
  if (
    address ===
      "0x3c1d4a86594d681ff7e5d5a233965daeabdc6a15fe5672ceeda5260038857183::vcoins::V<0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::stapt_token::StakedApt>" ||
    // Additional blacklisted scam APT tokens
    (symbol.toUpperCase() === "APT" &&
      !address?.includes("0x1::aptos_coin::AptosCoin") &&
      address !== "0x0000000000000000000000000000000000000000")
  ) {
    return "";
  }
  if (
    symbol.toUpperCase() === "USDC" &&
    address ===
      "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC"
  ) {
    return "lzUSDC";
  }
  // MKL Tokens
  if (
    address ===
    "0x878370592f9129e14b76558689a4b570ad22678111df775befbfcbc9fb3d90ab"
  ) {
    return "MKL";
  }
  if (
    address ===
    "0x5ae6789dd2fec1a9ec9cccfb3acaf12e93d432f0a3a42c92fe1a9d490b7bbc06::mkl_token::MKL"
  ) {
    return "MKL";
  }
  if (
    address ===
    "0x5ae6789dd2fec1a9ec9cccfb3acaf12e93d432f0a3a42c92fe1a9d490b7bbc06::house_lp::MKLP<0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC>"
  ) {
    return "MKLP";
  }
  if (
    address ===
    "0x3b5200e090d188c274e06b0d64b3f66638fb996fb0b350499975ff36b1f4595"
  ) {
    return "esMKL";
  }
  // CELL Token
  if (
    address ===
    "0x2ebb2ccac5e027a87fa0e2e5f656a3a4238d6a48d93ec9b610d570fc0aa0df12"
  ) {
    return "CELL";
  }
  // Amnis stAPT
  if (
    address ===
    "0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::stapt_token::StakedApt"
  ) {
    return "stAPT";
  }
  return symbol;
};

const getDisplayName = (
  symbol: string,
  address?: string,
  name?: string,
  chainType?: ChainType,
): string => {
  // Native token
  if (chainType && chainType in CHAIN_CONFIG) {
    const config = CHAIN_CONFIG[chainType as keyof typeof CHAIN_CONFIG];
    if (
      address === "0x0000000000000000000000000000000000000000" &&
      symbol.toUpperCase() === config.nativeCurrency.symbol
    ) {
      return config.nativeCurrency.name;
    }
  }

  // Special cases for non-EVM chains
  if (chainType === "aptos" && symbol.toUpperCase() === "APT") {
    return "Aptos";
  }
  if (chainType === "solana" && symbol.toUpperCase() === "SOL") {
    return "Solana";
  }
  if (chainType === "bitcoin" && symbol.toUpperCase() === "BTC") {
    return "Bitcoin";
  }

  return name || symbol;
};

function TokenBalanceComponent({
  token,
  quantity,
  price = 0,
  showPrice = false,
  compact = false,
  canHide = false,
  onHide,
  isHidden = false,
  showHiddenTokens = false,
  chainType,
  className,
}: TokenBalanceProps): JSX.Element | null {
  const value = useMemo(
    () => (price ? quantity * price : 0),
    [price, quantity],
  );

  const getExplorerUrl = useCallback(() => {
    if (!token.address) return "#";

    switch (chainType) {
      case "aptos":
        return `https://explorer.aptoslabs.com/account/${token.address}`;
      case "solana":
        return `https://solscan.io/token/${token.address}`;
      case "ethereum":
        return `https://etherscan.io/token/${token.address}`;
      default:
        return "#";
    }
  }, [token.address, chainType]);

  // Move all hooks before any conditional returns
  const isBlacklisted = useMemo(
    () =>
      token.address ===
      "0x3c1d4a86594d681ff7e5d5a233965daeabdc6a15fe5672ceeda5260038857183::vcoins::V<0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::stapt_token::StakedApt>",
    [token.address],
  );

  const isNativeToken = useMemo(
    () =>
      chainType &&
      ((chainType === "aptos" &&
        String(token.symbol || "").toUpperCase() === "APT") ||
        (chainType === "solana" &&
          String(token.symbol || "").toUpperCase() === "SOL") ||
        (chainType in CHAIN_CONFIG &&
          token.address === "0x0000000000000000000000000000000000000000" &&
          String(token.symbol || "").toUpperCase() ===
            CHAIN_CONFIG[chainType as keyof typeof CHAIN_CONFIG]?.nativeCurrency
              .symbol)),
    [chainType, token.symbol, token.address],
  );

  const displaySymbol = useMemo(
    () => getDisplaySymbol(token.symbol, token.address),
    [token.symbol, token.address],
  );

  const displayName = useMemo(
    () => getDisplayName(token.symbol, token.address, token.name, chainType),
    [token.symbol, token.address, token.name, chainType],
  );

  const explorerUrl = useMemo(() => getExplorerUrl(), [getExplorerUrl]);

  const { min, max } = useMemo(
    () =>
      getDecimalPrecision(
        token.symbol.toUpperCase(),
        quantity,
        value,
        chainType,
      ),
    [token.symbol, quantity, value, chainType],
  );

  const computedQuantity = useMemo(() => {
    // For large numbers, use the formatLargeNumber function
    if (quantity >= 1000) {
      return formatLargeNumber(quantity);
    }
    // For smaller numbers, use the regular formatter
    const formatter = getFormatter(min, max);
    return formatter.format(quantity);
  }, [quantity, min, max]);

  // Early return after all hooks
  if (isBlacklisted) return null;

  const displayQuantity = computedQuantity;
  const displayValue = value ? `$${formatLargeNumber(value)}` : "$0.00";
  const displayPrice = price ? formatCurrency(price, price >= 0.01) : "$0.00";

  return (
    <div
      className={cn(
        "group grid items-center transition-all duration-200",
        "grid-cols-3 gap-2",
        "px-3 py-1.5",
        isHidden && showHiddenTokens && "opacity-50",
        isNativeToken &&
          [
            "bg-accent/[0.04]",
            "border border-accent/[0.18]",
            "rounded-md",
            "shadow-[0_1px_1px_rgba(0,0,0,0.03)]",
            "hover:bg-accent/[0.09] hover:border-accent/25",
          ].join(" "),
        !isNativeToken && "hover:bg-accent/10 rounded-sm",
        className,
      )}
    >
      {/* Token Info - Left Column */}
      <div className="flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-1">
          {explorerUrl ? (
            <Link
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "font-medium leading-none hover:underline inline-flex items-center gap-1",
                compact ? "text-xs" : "text-sm",
                isNativeToken && "text-foreground font-semibold",
              )}
            >
              {displaySymbol}
              <ExternalLink
                className={cn("h-3 w-3", isNativeToken && "text-foreground/70")}
              />
            </Link>
          ) : (
            <span
              className={cn(
                "font-medium leading-none",
                compact ? "text-xs" : "text-sm",
                isNativeToken && "text-foreground font-semibold",
              )}
            >
              {displaySymbol}
            </span>
          )}
        </div>
        {!compact && displayName && (
          <span
            className={cn(
              "text-[10px] transition-colors duration-200 mt-0.5 whitespace-nowrap",
              isNativeToken
                ? "text-muted-foreground/70 group-hover:text-foreground/90"
                : "text-muted-foreground/50 group-hover:text-foreground/90",
            )}
          >
            {displayName}
          </span>
        )}
      </div>

      {/* Quantity - Middle Column */}
      <div className="flex justify-center">
        <span
          className={cn(
            "font-mono leading-none",
            compact ? "text-xs" : "text-sm",
            isNativeToken ? "text-foreground/90" : "text-muted-foreground",
          )}
        >
          {displayQuantity}
        </span>
      </div>

      {/* Value and Actions - Right Column */}
      <div className="flex items-center justify-end gap-2">
        <div className="flex flex-col items-end justify-center">
          <span
            className={cn(
              "font-mono tabular-nums leading-none",
              compact ? "text-xs" : "text-sm",
              isNativeToken && "font-medium",
            )}
          >
            {displayValue}
          </span>
          {showPrice && price && price > 0 && !compact && (
            <span
              className={cn(
                "text-[10px] font-mono mt-0.5",
                isNativeToken
                  ? "text-muted-foreground/70 group-hover:text-foreground/90"
                  : "text-muted-foreground/50 group-hover:text-foreground/90",
              )}
            >
              {displayPrice}
            </span>
          )}
        </div>
        {canHide && onHide && showHiddenTokens && (
          <button
            onClick={onHide}
            className={cn(
              "opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md",
              isNativeToken ? "hover:bg-accent/30" : "hover:bg-accent",
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
  );
}

export const TokenBalance = memo(TokenBalanceComponent);
