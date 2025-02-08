import React from "react";
import Image from "next/image";
import { formatCurrency, formatRelativeTime } from "@/lib/utils/format";
import type { BalanceDisplayProps } from "../types";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

export const SolanaTokenBalance: React.FC<BalanceDisplayProps> = ({
  balance,
  balances = [],
  prices,
  showPrice = true,
  compact = false,
  onHide,
  canHide = false,
  isHidden = false,
  showHiddenTokens = false,
  showUSD = true,
  showChange = true,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const lastUpdated = prices[balance.token.symbol]?.lastUpdated || Date.now();

  // Calculate total USD value from all balances
  const totalValueUsd = React.useMemo(() => {
    const allBalances = [balance, ...balances];
    return allBalances.reduce((total, b) => total + (b.valueUsd || 0), 0);
  }, [balance, balances]);

  // Get the main token balance for display
  const mainBalance = balance.uiAmount.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });

  return (
    <div className={`bg-card rounded-lg p-4 ${className}`}>
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 relative">
            <Image
              src="/icons/chain-icons/solana.webp"
              alt="Solana"
              width={32}
              height={32}
              className="rounded-full"
            />
          </div>
          <div>
            <h3 className="text-lg font-medium">Solana ({mainBalance} SOL)</h3>
            <p className="text-sm text-muted-foreground">Wallet</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <p className="text-lg font-medium">{formatCurrency(totalValueUsd)}</p>
          <p className="text-sm text-muted-foreground">
            Updated {formatRelativeTime(lastUpdated)}
          </p>
        </div>
        <ChevronDownIcon
          className={`w-5 h-5 ml-2 transform transition-transform ${isExpanded ? "rotate-180" : ""}`}
        />
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3">
          {[balance, ...balances].map((b) => {
            const formattedBalance = b.uiAmount;
            const price = prices[b.token.symbol]?.price ?? 0;
            const priceChange = prices[b.token.symbol]?.priceChange24h ?? 0;

            return (
              <div
                key={b.token.symbol}
                className="flex justify-between items-center"
              >
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{b.token.symbol}</span>
                  <span className="text-sm text-muted-foreground">
                    {formattedBalance.toLocaleString(undefined, {
                      maximumFractionDigits:
                        b.token.symbol === "USDC" || b.token.symbol === "USDT"
                          ? 2
                          : 4,
                      minimumFractionDigits: 2,
                    })}{" "}
                    @ $
                    {price.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                {showUSD && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium">
                      {formatCurrency(b.valueUsd || 0)}
                    </span>
                    {showChange && (
                      <span
                        className={`text-xs ${priceChange >= 0 ? "text-green-500" : "text-red-500"}`}
                      >
                        {priceChange >= 0 ? "+" : ""}
                        {Math.round(priceChange)}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
