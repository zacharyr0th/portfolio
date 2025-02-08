import { useState, useCallback, useEffect } from "react";
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
  tokens: {
    balances: TokenData[];
    prices: Record<string, { price: number; timestamp: number }>;
    totalValueUsd: number;
  };
}

interface AptosCardProps {
  account: WalletAccount;
  compact?: boolean;
  isExpanded?: boolean;
  onUpdateValue?: (id: string, value: number) => void;
  showHiddenTokens?: boolean;
}

// Constants
const COPY_TIMEOUT_MS = 2000;
const EXPLORER_URL = "https://explorer.aptoslabs.com/account";

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
function shortenAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function AptosCard({
  account,
  compact = false,
  isExpanded = false,
  onUpdateValue,
  showHiddenTokens = false,
}: AptosCardProps): JSX.Element {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(isExpanded);
  const [showNftModal, setShowNftModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<ApiResponse["tokens"]>({
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

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/aptos?address=${account.publicKey}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      setTokenData(data.tokens);

      // Update total value
      if (onUpdateValue) {
        onUpdateValue(account.id, data.tokens.totalValueUsd);
      }

      setLastFetchTime(Date.now());
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch data";
      logger.error("Error fetching Aptos data:", new Error(message));
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [account.publicKey, account.id, onUpdateValue]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filteredBalances = tokenData.balances.filter((balance) => {
    const walletHidden = hiddenTokens[account.id] || [];
    return showHiddenTokens || !walletHidden.includes(balance.token.symbol);
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

  // Find APT balance for display in title
  const aptBalance = filteredBalances.find(
    (balance) => balance.token.type === "0x1::aptos_coin::AptosCoin",
  );
  const displayName = aptBalance
    ? `${account.name} (${formatLargeNumber(aptBalance.uiAmount)} APT)`
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
              {filteredBalances.map((balance) => {
                const price =
                  tokenData.prices[balance.token.type]?.price ||
                  tokenData.prices[balance.token.symbol]?.price ||
                  0;

                const walletHidden = hiddenTokens[account.id] || [];
                const isHidden = walletHidden.includes(balance.token.symbol);

                return (
                  <TokenBalance
                    key={balance.token.type}
                    token={{
                      symbol: balance.token.symbol,
                      name: balance.token.name,
                      decimals: balance.token.decimals,
                      address: balance.token.type,
                    }}
                    quantity={balance.uiAmount}
                    price={price}
                    showPrice={true}
                    canHide={true}
                    onHide={() => toggleHideToken(balance.token.symbol)}
                    isHidden={isHidden}
                    showHiddenTokens={showHiddenTokens}
                    chainType="aptos"
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
          walletAddress={account.publicKey}
          chain="aptos"
          onClose={() => setShowNftModal(false)}
        />
      )}
    </>
  );
}
