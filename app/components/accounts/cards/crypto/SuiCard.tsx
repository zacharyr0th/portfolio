import { useState, useCallback, useEffect } from "react";
import { BaseCard } from "../BaseCard";
import { TokenBalance } from "../TokenBalance";
import { Copy, Check, ExternalLink, Image as ImageIcon } from "lucide-react";
import type { WalletAccount } from "../types";
import { useLocalStorage } from "@/lib/utils/hooks/useLocalStorage";
import { logger } from "@/lib/utils/core/logger";
import { NftModal } from "../modals/NftModal";
import { type ChainType } from "@/lib/chains/constants";

interface SuiCardProps {
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
      tokenAddress: string;
      verified: boolean;
    };
    balance: string;
    uiAmount: number;
  }>;
  prices: Record<string, { price: number; timestamp: number }>;
}

// Constants
const COPY_TIMEOUT_MS = 2000;
const EXPLORER_URL = "https://suiexplorer.com/address";

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

// Add utility function for shortening addresses
function shortenAddress(address: string | undefined | null): string {
  if (!address) return "";
  if (address.length < 8) return address;
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
    balances: [],
    prices: {},
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

      const response = await fetch(
        `/api/assets?address=${account.publicKey}&chain=sui&include_nfts=false`,
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch balances");
      }

      const data = await response.json();
      setTokenData({
        balances: data.tokens?.balances || [],
        prices: data.tokens?.prices || {},
      });

      // Calculate total value and update parent
      const totalValue = (data.tokens?.balances || []).reduce(
        (sum: number, balance: any) => {
          const price = data.tokens?.prices[balance.token.symbol]?.price || 0;
          const amount =
            Number(balance.balance) / Math.pow(10, balance.token.decimals);
          return sum + amount * price;
        },
        0,
      );

      if (isFinite(totalValue)) {
        onUpdateValue?.(account.id, totalValue);
      }

      setLastFetchTime(Date.now());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Error fetching Sui data:", new Error(message));
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [account.publicKey, account.id, onUpdateValue]);

  useEffect(() => {
    if (isOpen) {
      fetchBalances();
      const interval = setInterval(fetchBalances, 60000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [isOpen, fetchBalances]);

  const filteredBalances = tokenData.balances.filter((balance) => {
    if (!balance?.token?.decimals) return false;
    const amount =
      Number(balance.balance) / Math.pow(10, balance.token.decimals);
    const walletHidden = hiddenTokens[account.id] || [];
    return (
      amount !== 0 &&
      (showHiddenTokens || !walletHidden.includes(balance.token.symbol))
    );
  });

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

  return (
    <>
      <BaseCard
        account={{
          ...account,
          value: filteredBalances.reduce((sum, balance) => {
            const price = tokenData.prices[balance.token.symbol]?.price || 0;
            const amount =
              Number(balance.balance) / Math.pow(10, balance.token.decimals);
            return sum + amount * price;
          }, 0),
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
            <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {filteredBalances.map((balance) => {
                const amount =
                  Number(balance.balance) /
                  Math.pow(10, balance.token.decimals);
                const price =
                  tokenData.prices[balance.token.symbol]?.price || 0;
                const walletHidden = hiddenTokens[account.id] || [];
                const isHidden = walletHidden.includes(balance.token.symbol);

                return (
                  <TokenBalance
                    key={`${account.id}-${balance.token.tokenAddress}`}
                    token={{
                      symbol: balance.token.symbol,
                      name: balance.token.name,
                      decimals: balance.token.decimals,
                      address: balance.token.tokenAddress,
                    }}
                    quantity={amount}
                    price={price}
                    showPrice
                    compact={compact}
                    canHide={true}
                    onHide={() => toggleHideToken(balance.token.symbol)}
                    isHidden={isHidden}
                    showHiddenTokens={showHiddenTokens}
                    chainType="sui"
                  />
                );
              })}
            </div>
            <div className="pt-2 border-t border-border">
              <button
                onClick={() => setShowNftModal(true)}
                className="w-full flex items-center justify-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent rounded-md transition-colors"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                View NFTs
              </button>
            </div>
          </div>
        )}
      </BaseCard>

      <NftModal
        isOpen={showNftModal}
        onClose={() => setShowNftModal(false)}
        walletAddress={account.publicKey}
        chain={account.chain}
      />
    </>
  );
}
