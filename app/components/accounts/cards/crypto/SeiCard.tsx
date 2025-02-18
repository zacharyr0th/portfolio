import { useState, useCallback, useEffect, useMemo } from "react";
import { BaseCard } from "../BaseCard";
import { TokenBalance } from "../TokenBalance";
import { Copy, Check, ExternalLink, Image as ImageIcon } from "lucide-react";
import type { WalletAccount } from "../types";
import { useLocalStorage } from "@/lib/utils/hooks/useLocalStorage";
import { NftModal } from "../modals/NftModal";
import { cn } from "@/lib/utils";
import { NFTBalance } from "@/lib/data/simplehash";
import { logger } from "@/lib/utils/core/logger";

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
  const [nfts, setNfts] = useState<NFTBalance[]>([]);
  const [isLoadingNfts, setIsLoadingNfts] = useState(true);
  const [nftError, setNftError] = useState<string | null>(null);

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
        `/api/sei/balance?address=${encodeURIComponent(account.publicKey)}`,
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch balances");
      }

      const data = await response.json();
      logger.debug("Sei balance response:", data);

      if (!data?.tokens?.balances) {
        throw new Error("Invalid response format");
      }

      setTokenData(data);
      setError(null);

      if (onUpdateValue) {
        onUpdateValue(account.id, data.tokens.totalValueUsd || 0);
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

  // Initial fetch and periodic refresh
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      if (mounted) {
        await fetchBalances();
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, REFRESH_INTERVAL);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [fetchBalances]);

  const filteredBalances = useMemo(() => {
    if (!tokenData?.tokens?.balances) return [];
    const walletHidden = hiddenTokens[account.id] || [];
    return tokenData.tokens.balances.filter((balance) => {
      if (!balance?.token?.symbol) return false;
      if (!showHiddenTokens && walletHidden.includes(balance.token.symbol)) {
        return false;
      }
      return true;
    });
  }, [tokenData.tokens?.balances, hiddenTokens, account.id, showHiddenTokens]);

  // Find SEI balance for display in title
  const seiBalance = useMemo(() => {
    return filteredBalances.find((balance) => balance?.token?.type === "sei");
  }, [filteredBalances]);

  const displayName = seiBalance
    ? `${account.name} (${formatLargeNumber(seiBalance.uiAmount)} SEI)`
    : account.name;

  const fetchNfts = useCallback(async () => {
    try {
      setIsLoadingNfts(true);
      setNftError(null);

      let allNfts: NFTBalance[] = [];
      let hasMore = true;
      let cursor: string | undefined;

      // First fetch
      const initialNftUrl = `/api/simplehash?wallet=${account.publicKey}&chain=sei&limit=500&order_by=transfer_time__desc`;
      const initialResponse = await fetch(initialNftUrl);
      const initialData = await initialResponse.json();

      if (initialData && initialData.nfts) {
        allNfts = [...initialData.nfts];
        cursor = initialData.next_cursor;
        hasMore = Boolean(cursor);

        // Keep fetching while we have more pages
        while (hasMore && cursor) {
          const nftUrl = `/api/simplehash?wallet=${account.publicKey}&chain=sei&limit=500&cursor=${cursor}&order_by=transfer_time__desc`;
          const nftResponse = await fetch(nftUrl);

          if (!nftResponse.ok) {
            throw new Error(
              `Failed to fetch NFTs page: HTTP ${nftResponse.status}`,
            );
          }

          const nftData = await nftResponse.json();

          if (!nftData || !nftData.nfts) {
            throw new Error("Invalid NFT data received");
          }

          allNfts = [...allNfts, ...nftData.nfts];

          if (nftData.next_cursor) {
            cursor = nftData.next_cursor;
          } else {
            hasMore = false;
          }

          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        setNfts(allNfts);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch NFTs";
      logger.error(
        "Error fetching Sei NFTs",
        err instanceof Error ? err : new Error(String(err)),
      );
      setNftError(errorMessage);
    } finally {
      setIsLoadingNfts(false);
    }
  }, [account.publicKey]);

  useEffect(() => {
    fetchNfts();
  }, [fetchNfts]);

  return (
    <>
      <BaseCard
        account={{
          ...account,
          value: tokenData.tokens?.totalValueUsd || 0,
          name: displayName,
          chain: "sei",
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
                  key={balance.token.address}
                  token={{
                    symbol: balance.token.symbol,
                    name: balance.token.name,
                    decimals: balance.token.decimals,
                    address: balance.token.address,
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
                  chainType="sei"
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-4">
              {isLoadingNfts ? (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Loading NFTs...
                </div>
              ) : nfts?.length > 0 ? (
                <button
                  onClick={() => setShowNftModal(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  View {nfts.length} NFTs on Sei
                </button>
              ) : (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ImageIcon className="h-3.5 w-3.5" />
                  {nftError
                    ? `Error loading NFTs: ${nftError}`
                    : "No NFTs in this wallet"}
                </div>
              )}
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
          nfts={nfts}
          isLoading={isLoading}
          error={error}
          emptyMessage="No NFTs found in this wallet. NFTs must be on Sei's EVM chain to be displayed."
        />
      )}
    </>
  );
}
