import { useState, useCallback, useEffect, useMemo } from "react";
import { BaseCard } from "../BaseCard";
import { TokenBalance } from "../TokenBalance";
import { Copy, Check, ExternalLink, Image as ImageIcon } from "lucide-react";
import type { WalletAccount } from "../types";
import { useLocalStorage } from "@/lib/utils/hooks/useLocalStorage";
import { logger } from "@/lib/utils/core/logger";
import { NftModal } from "../modals/NftModal";

interface TokenData {
  token: {
    symbol: string;
    name: string;
    decimals: number;
    address: string;
    chain: string;
    type: string;
  };
  balance: string;
  uiAmount: number;
  valueUsd: number;
}

interface ApiResponse {
  balances: TokenData[];
  prices: Record<string, { price: number; timestamp: number }>;
  totalValueUsd: number;
}

interface SeiCardProps {
  account: WalletAccount;
  compact?: boolean;
  isExpanded?: boolean;
  onUpdateValue?: (id: string, value: number) => void;
  showHiddenTokens?: boolean;
}

// Constants
const COPY_TIMEOUT_MS = 2000;
const EXPLORER_URL = "https://www.seiscan.app/accounts";
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

export function SeiCard({
  account,
  compact = false,
  isExpanded = false,
  onUpdateValue,
  showHiddenTokens = false,
}: SeiCardProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(isExpanded);
  const [showNftModal, setShowNftModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<ApiResponse>({
    balances: [],
    prices: {},
    totalValueUsd: 0,
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

  const fetchBalances = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/sei/balance?address=${account.publicKey}`,
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch balances");
      }

      const data = await response.json();
      setTokenData(data);

      if (onUpdateValue) {
        onUpdateValue(account.id, data.totalValueUsd || 0);
      }

      setLastFetchTime(Date.now());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Error fetching Sei balances:", new Error(message));
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [account.publicKey, account.id, onUpdateValue]);

  useEffect(() => {
    if (isOpen) {
      fetchBalances();
      const interval = setInterval(fetchBalances, REFRESH_INTERVAL);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [isOpen, fetchBalances]);

  const filteredBalances = useMemo(() => {
    if (!tokenData?.balances) return [];
    const walletHidden = hiddenTokens[account.id] || [];
    return tokenData.balances.filter((balance) => {
      if (!balance?.token?.symbol) return false;
      return showHiddenTokens || !walletHidden.includes(balance.token.symbol);
    });
  }, [tokenData.balances, hiddenTokens, account.id, showHiddenTokens]);

  // Find SEI balance for display in title
  const seiBalance = useMemo(() => {
    return filteredBalances.find((balance) => balance?.token?.type === "sei");
  }, [filteredBalances]);

  const displayName = seiBalance
    ? `${account.name} (${formatLargeNumber(seiBalance.uiAmount)} SEI)`
    : account.name;

  return (
    <>
      <BaseCard
        account={{
          ...account,
          value: tokenData.totalValueUsd,
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
            <div className="space-y-1 max-h-[200px] overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:rounded-full">
              {filteredBalances.map((balance) => (
                <TokenBalance
                  key={balance.token.address}
                  token={{
                    symbol: balance.token.symbol,
                    name: balance.token.name,
                    decimals: balance.token.decimals,
                    address: balance.token.address,
                  }}
                  quantity={balance.uiAmount}
                  price={tokenData.prices[balance.token.symbol]?.price}
                  showPrice={true}
                  canHide={true}
                  onHide={() => toggleHideToken(balance.token.symbol)}
                  isHidden={(hiddenTokens[account.id] || []).includes(
                    balance.token.symbol,
                  )}
                  showHiddenTokens={showHiddenTokens}
                  chainType="sei"
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
          chain="sei"
          onClose={() => setShowNftModal(false)}
        />
      )}
    </>
  );
}
