"use client";

import { memo } from "react";
import { formatCurrency } from "@/lib/utils/core/format";
import { cn } from "@/lib/utils";
import { EyeOff, Eye, ExternalLink, Copy, Check } from "lucide-react";
import Link from "next/link";
import { EVM_CHAINS } from "./types";
import type { BalanceDisplayProps } from "../types";

function TokenBalanceComponent({
  balance,
  prices,
  showPrice = true,
  compact = false,
  onHide,
  canHide = false,
  isHidden = false,
  showHiddenTokens = false,
}: BalanceDisplayProps) {
  const token = balance.token;
  const quantity = balance.uiAmount;
  const price = prices[token.symbol]?.price || 0;
  const value = price * quantity;

  const chain =
    "chainId" in token
      ? Object.values(EVM_CHAINS).find((c) => c.chainId === token.chainId)
      : null;

  // Check if this is a native token
  const isNativeToken =
    "address" in token &&
    token.address === "0x0000000000000000000000000000000000000000";

  // Get explorer URL based on chain
  const getExplorerUrl = () => {
    if (!chain || !("address" in token)) return null;
    return `${chain.explorerUrl}/token/${token.address}`;
  };

  // Smart decimal precision based on token and value
  const getDecimalPrecision = () => {
    const symbol = token.symbol.toUpperCase();

    // For very small quantities, show more decimals
    if (quantity < 0.000001) return { min: 8, max: 8 };
    if (quantity < 0.001) return { min: 6, max: 6 };
    if (quantity < 0.1) return { min: 4, max: 4 };

    // Token-specific formatting
    switch (symbol) {
      case "BTC":
      case "WBTC":
        return { min: 6, max: 8 };
      case "ETH":
        return { min: 4, max: 6 };
      case "MATIC":
        return quantity < 1 ? { min: 4, max: 6 } : { min: 2, max: 4 };
      case "USDC":
      case "USDT":
      case "USD":
        return { min: 2, max: 2 };
      default:
        // For values under $1, show more decimals
        if (value < 1) return { min: 2, max: 4 };
        // For regular values, keep it simple
        return { min: 2, max: 2 };
    }
  };

  const { min, max } = getDecimalPrecision();
  const formattedQuantity = quantity.toLocaleString(undefined, {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
    useGrouping: quantity >= 1000,
  });

  const explorerUrl = getExplorerUrl();

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
              {token.symbol}
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
              {token.symbol}
            </span>
          )}
        </div>
        {!compact && token.name && (
          <span className="text-xs text-muted-foreground truncate">
            {token.name}
          </span>
        )}
      </div>

      {/* Balance - Middle Column */}
      <div className="text-right">
        <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
          {formattedQuantity}
        </span>
      </div>

      {/* Value - Right Column */}
      {showPrice && (
        <div className="text-right">
          <span
            className={cn(
              "text-muted-foreground",
              compact ? "text-xs" : "text-sm",
            )}
          >
            {formatCurrency(value)}
          </span>
        </div>
      )}

      {/* Hide/Show Button */}
      {canHide && (
        <button
          onClick={onHide}
          className="absolute right-2 opacity-0 group-hover:opacity-100 hover:text-accent-foreground transition-opacity"
          aria-label={isHidden ? "Show token" : "Hide token"}
        >
          {isHidden ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );
}

export const TokenBalance = memo(TokenBalanceComponent);
