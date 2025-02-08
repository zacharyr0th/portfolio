import { useState, useCallback, useEffect, useMemo } from "react";
import { BaseCard } from "../BaseCard";
import { TokenBalance } from "../TokenBalance";
import { Copy, Check, ExternalLink, Image as ImageIcon } from "lucide-react";
import type { WalletAccount } from "../types";
import { useLocalStorage } from "@/lib/utils/hooks/useLocalStorage";
import { logger } from "@/lib/utils/core/logger";
import { NftModal } from "../modals/NftModal";
import { cn } from "@/lib/utils";

interface SolanaCardProps {
  account: WalletAccount;
  compact?: boolean;
  isExpanded?: boolean;
  onUpdateValue?: (id: string, value: number) => void;
  showHiddenTokens?: boolean;
}

interface TokenData {
  balances: Array<{
    token: {
      symbol: string;
      name: string;
      decimals: number;
      address: string;
      verified: boolean;
    };
    balance: string;
    uiAmount: number;
  }>;
  prices: Record<string, { price: number; timestamp: number }>;
}

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
  }
  return num.toFixed(2);
}

// Add utility function for shortening addresses
function shortenAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

// Add formatUSD utility function at the top with other utility functions
function formatUSD(value: number): string {
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  } else if (value >= 1e3) {
    return `$${(value / 1e3).toFixed(2)}K`;
  } else if (value < 0.01 && value > 0) {
    return "< $0.01";
  } else {
    return `$${value.toFixed(2)}`;
  }
}

export function SolanaCard({
  account,
  compact = false,
  isExpanded = false,
  onUpdateValue,
  showHiddenTokens = false,
}: SolanaCardProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(isExpanded);
  const [showNftModal, setShowNftModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<TokenData>({
    balances: [],
    prices: {},
  });
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [hiddenTokens, setHiddenTokens] = useLocalStorage<
    Record<string, string[]>
  >("hidden-tokens", {});

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(account.publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [account.publicKey]);

  const getExplorerUrl = useCallback((walletAccount: WalletAccount) => {
    const { publicKey } = walletAccount;
    return `https://solscan.io/account/${publicKey}`;
  }, []);

  const toggleHideToken = useCallback(
    (symbol: string) => {
      setHiddenTokens((prev) => {
        const walletHidden = prev[account.id] || [];
        const isHidden = walletHidden.includes(symbol);

        if (isHidden) {
          return {
            ...prev,
            [account.id]: walletHidden.filter((s) => s !== symbol),
          };
        } else {
          return {
            ...prev,
            [account.id]: [...walletHidden, symbol],
          };
        }
      });
    },
    [account.id, setHiddenTokens],
  );

  // Fetch balances from the API
  const fetchBalances = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/solana/balance?address=${account.publicKey}`,
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch balances");
      }

      const data = await response.json();

      // Normalize the price data to ensure correct values
      const normalizedPrices = Object.fromEntries(
        Object.entries(data.prices || {}).map(([symbol, priceData]) => {
          const typedPriceData = priceData as {
            price: number | string;
            timestamp?: number;
          };
          return [
            symbol,
            {
              price:
                typeof typedPriceData.price === "number"
                  ? typedPriceData.price
                  : Number(typedPriceData.price) || 0,
              timestamp: typedPriceData.timestamp || Date.now(),
            },
          ];
        }),
      );

      setTokenData({
        balances: data.balances || [],
        prices: normalizedPrices,
      });

      // Calculate total value and update parent
      const totalValue = data.balances.reduce(
        (sum: number, balance: TokenData["balances"][0]) => {
          const price = normalizedPrices[balance.token.symbol]?.price || 0;
          return sum + balance.uiAmount * price;
        },
        0,
      );

      if (onUpdateValue) {
        onUpdateValue(account.id, totalValue);
      }

      setLastFetchTime(Date.now());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Error fetching Solana balances:", new Error(message));
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [account.publicKey, account.id, onUpdateValue]);

  // Initial fetch on mount and refresh every 5 minutes
  useEffect(() => {
    fetchBalances();
    const intervalId = setInterval(fetchBalances, 300000);
    return () => clearInterval(intervalId);
  }, [fetchBalances]);

  const filteredBalances = useMemo(() => {
    const walletHidden = hiddenTokens[account.id] || [];
    return tokenData.balances.filter((balance) => {
      if (!showHiddenTokens && walletHidden.includes(balance.token.symbol)) {
        return false;
      }
      return true;
    });
  }, [tokenData.balances, hiddenTokens, account.id, showHiddenTokens]);

  // Find SOL balance for display in title
  const solBalance = filteredBalances.find(
    (balance) => balance.token.symbol === "SOL",
  );
  const displayName = solBalance
    ? `${account.name} (${formatLargeNumber(solBalance.uiAmount)} SOL)`
    : account.name;

  return (
    <>
      <BaseCard
        account={{
          ...account,
          name: displayName,
          value: tokenData.balances.reduce((sum, balance) => {
            const price = tokenData.prices[balance.token.symbol]?.price || 0;
            return sum + balance.uiAmount * price;
          }, 0),
          formattedValue: formatUSD(
            tokenData.balances.reduce((sum, balance) => {
              const price = tokenData.prices[balance.token.symbol]?.price || 0;
              const value = balance.uiAmount * price;
              return sum + value;
            }, 0),
          ),
        }}
        expanded={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        variant={compact ? "compact" : "detailed"}
        isLoading={isLoading}
        error={error}
        lastUpdated={lastFetchTime}
      >
        {!compact && isOpen && !isLoading && !error && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="font-mono text-xs text-muted-foreground truncate">
                {shortenAddress(account.publicKey)}
              </div>
              <button
                onClick={handleCopy}
                className="p-1 hover:bg-accent rounded-md transition-colors"
                aria-label="Copy address"
              >
                <Copy className="h-3 w-3" />
              </button>
              <a
                href={getExplorerUrl(account)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 hover:bg-accent rounded-md transition-colors"
                aria-label="View on explorer"
              >
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            </div>
            <div
              className={cn(
                "flex flex-col gap-1",
                "h-[186px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
              )}
            >
              {filteredBalances.map((balance) => {
                const walletHidden = hiddenTokens[account.id] || [];
                const isHidden = walletHidden.includes(balance.token.symbol);
                const price = Number(
                  tokenData.prices[balance.token.symbol]?.price || 0,
                );

                if (!showHiddenTokens && isHidden) {
                  return null;
                }

                return (
                  <TokenBalance
                    key={`sol-${account.id}-${balance.token.symbol}-${balance.token.address}`}
                    token={{
                      symbol: balance.token.symbol,
                      name: balance.token.name,
                      decimals: balance.token.decimals,
                      address: balance.token.address,
                    }}
                    quantity={balance.uiAmount}
                    price={price}
                    showPrice
                    compact={compact}
                    canHide={true}
                    onHide={() => toggleHideToken(balance.token.symbol)}
                    isHidden={isHidden}
                    showHiddenTokens={showHiddenTokens}
                    chainType="solana"
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => setShowNftModal(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                View NFTs
              </button>
            </div>
          </div>
        )}
      </BaseCard>
      {showNftModal && (
        <NftModal
          isOpen={showNftModal}
          onClose={() => setShowNftModal(false)}
          walletAddress={account.publicKey}
          chain="solana"
        />
      )}
    </>
  );
}
