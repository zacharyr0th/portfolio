import { useState, useCallback, useEffect, useMemo } from "react";
import { BaseCard } from "../BaseCard";
import { TokenBalance } from "../TokenBalance";
import { Copy, Check, ExternalLink, Image as ImageIcon } from "lucide-react";
import type { WalletAccount } from "../types";
import { useLocalStorage } from "@/lib/utils/hooks/useLocalStorage";
import { NftModal } from "../modals/NftModal";
import { cn } from "@/lib/utils";

interface TokenData {
  tokens: {
    balances: Array<{
      token: {
        symbol: string;
        name: string;
        decimals: number;
        tokenAddress: string;
        chainId: number;
        isNative: boolean;
      };
      balance: string;
      uiAmount: number;
      valueUsd: number;
    }>;
    prices: Record<string, { price: number; timestamp: number }>;
    totalValueUsd: number;
  };
}

interface SuiCardProps {
  account: WalletAccount;
  compact?: boolean;
  isExpanded?: boolean;
  onUpdateValue?: (id: string, value: number) => void;
  showHiddenTokens?: boolean;
}

// Constants
const COPY_TIMEOUT_MS = 2000;
const EXPLORER_URL = "https://suiexplorer.com/address";
const REFRESH_INTERVAL = 60000; // 1 minute

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

export function SuiCard({
  account,
  compact = false,
  isExpanded = false,
  onUpdateValue,
  showHiddenTokens = false,
}: SuiCardProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(isExpanded);
  const [showNftModal, setShowNftModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<TokenData>({
    tokens: {
      balances: [],
      prices: {},
      totalValueUsd: 0,
    },
  });
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [hiddenTokens, setHiddenTokens] = useLocalStorage<
    Record<string, string[]>
  >("hidden-tokens", {});

  // Handle expanded state changes
  useEffect(() => {
    setIsOpen(isExpanded);
  }, [isExpanded]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(account.publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_TIMEOUT_MS);
  }, [account.publicKey]);

  const fetchBalances = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Log the request details
      console.log("Fetching Sui balances for address:", account.publicKey);

      const response = await fetch(
        `/api/sui/balance?address=${encodeURIComponent(account.publicKey)}`,
      );

      // Log the raw response
      console.log("Sui balance API response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Sui balance API error:", errorData);
        throw new Error(errorData.error || "Failed to fetch balances");
      }

      const data = await response.json();
      console.log("Sui balance API response data:", data);

      if (!data?.tokens?.balances) {
        throw new Error("Invalid response format");
      }

      setTokenData(data);
      setError(null);

      if (onUpdateValue && data.tokens.totalValueUsd) {
        onUpdateValue(account.id, data.tokens.totalValueUsd);
      }

      setLastFetchTime(Date.now());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error fetching Sui balances:", message);
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
    return tokenData.tokens.balances.filter((balance) => {
      if (!balance?.token?.decimals) return false;
      if (!showHiddenTokens && walletHidden.includes(balance.token.symbol)) {
        return false;
      }
      return true;
    });
  }, [tokenData.tokens.balances, hiddenTokens, account.id, showHiddenTokens]);

  const toggleHideToken = useCallback(
    (symbol: string) => {
      setHiddenTokens((prev) => {
        const walletHidden = prev[account.id] || [];
        const isHidden = walletHidden.includes(symbol);
        return {
          ...prev,
          [account.id]: isHidden
            ? walletHidden.filter((s) => s !== symbol)
            : [...walletHidden, symbol],
        };
      });
    },
    [account.id, setHiddenTokens],
  );

  // Find SUI balance for display in title
  const suiBalance = filteredBalances.find((balance) => balance.token.isNative);

  const displayName = suiBalance
    ? `${account.name} (${formatLargeNumber(suiBalance.uiAmount)} SUI)`
    : account.name;

  return (
    <>
      <BaseCard
        account={{
          ...account,
          value: tokenData.tokens.totalValueUsd || 0,
          name: displayName,
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
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
              <a
                href={`${EXPLORER_URL}/${account.publicKey}`}
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
              {filteredBalances.map((balance) => (
                <TokenBalance
                  key={balance.token.tokenAddress}
                  token={{
                    symbol: balance.token.symbol,
                    name: balance.token.name,
                    decimals: balance.token.decimals,
                    address: balance.token.tokenAddress,
                  }}
                  quantity={balance.uiAmount}
                  price={tokenData.tokens.prices[balance.token.symbol]?.price}
                  showPrice={true}
                  canHide={true}
                  onHide={() => toggleHideToken(balance.token.symbol)}
                  isHidden={(hiddenTokens[account.id] || []).includes(
                    balance.token.symbol,
                  )}
                  showHiddenTokens={showHiddenTokens}
                  chainType="sui"
                />
              ))}
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
          walletAddress={account.publicKey}
          chain="sui"
          onClose={() => setShowNftModal(false)}
        />
      )}
    </>
  );
}
