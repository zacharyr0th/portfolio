import { useState, useCallback, useEffect, useMemo } from "react";
import { BaseCard } from "../BaseCard";
import { TokenBalance } from "../TokenBalance";
import { Copy, Check, ExternalLink, Image as ImageIcon } from "lucide-react";
import type { WalletAccount } from "../types";
import { useLocalStorage } from "@/lib/utils/hooks/useLocalStorage";
import { logger } from "@/lib/utils/core/logger";
import { NftModal } from "../modals/NftModal";
import { cn } from "@/lib/utils";
import type { NFTBalance } from "@/lib/data/simplehash";

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
  const [isLoadingNfts, setIsLoadingNfts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nftError, setNftError] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<ApiResponse["tokens"]>({
    balances: [],
    prices: {},
    totalValueUsd: 0,
  });
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [hiddenTokens, setHiddenTokens] = useLocalStorage<
    Record<string, string[]>
  >("hidden-tokens", {});
  const [nfts, setNfts] = useState<NFTBalance[]>([]);

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

      // Fetch balance data
      const balanceResponse = await fetch(
        `/api/aptos?address=${account.publicKey}`,
      );
      if (!balanceResponse.ok) {
        throw new Error(`API error: ${balanceResponse.status}`);
      }
      const balanceData = await balanceResponse.json();
      setTokenData(balanceData.tokens);

      // Update total value
      if (onUpdateValue) {
        onUpdateValue(account.id, balanceData.tokens.totalValueUsd);
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

  const fetchNfts = useCallback(async () => {
    try {
      setIsLoadingNfts(true);
      setNftError(null);

      let allNfts: NFTBalance[] = [];
      let hasMore = true;
      let cursor: string | undefined;

      const headers = {
        "X-API-KEY": process.env.SIMPLEHASH_API_KEY || "",
        accept: "application/json",
      };

      // First fetch
      const initialNftUrl = `/api/simplehash?wallet=${account.publicKey}&chain=aptos&limit=500&order_by=transfer_time__desc`;
      const initialResponse = await fetch(initialNftUrl, { headers });
      const initialData = await initialResponse.json();

      if (initialData && initialData.nfts) {
        allNfts = [...initialData.nfts];
        cursor = initialData.next_cursor;
        hasMore = Boolean(cursor);

        // Keep fetching while we have more pages
        while (hasMore && cursor) {
          const nftUrl = `/api/simplehash?wallet=${account.publicKey}&chain=aptos&limit=500&cursor=${cursor}&order_by=transfer_time__desc`;
          const nftResponse = await fetch(nftUrl, { headers });

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
      const message =
        err instanceof Error ? err.message : "Failed to fetch NFTs";
      logger.error("Error fetching Aptos NFTs:", new Error(message));
      setNftError(message);
    } finally {
      setIsLoadingNfts(false);
    }
  }, [account.publicKey]);

  // Separate effects for balance and NFT data
  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 300000);
    return () => clearInterval(intervalId);
  }, [fetchData]);

  useEffect(() => {
    fetchNfts();
  }, [fetchNfts]);

  const filteredBalances = useMemo(() => {
    const walletHidden = hiddenTokens[account.id] || [];
    return tokenData.balances.filter((balance) => {
      if (!showHiddenTokens && walletHidden.includes(balance.token.symbol)) {
        return false;
      }
      return true;
    });
  }, [tokenData.balances, hiddenTokens, account.id, showHiddenTokens]);

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
            <div
              className={cn(
                "flex flex-col gap-1",
                "h-[186px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
              )}
            >
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
                  View {nfts.length} NFTs on Aptos
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
          chain="aptos"
          onClose={() => setShowNftModal(false)}
          nfts={nfts}
          isLoading={isLoadingNfts}
          error={nftError}
          emptyMessage="No NFTs found in this wallet"
        />
      )}
    </>
  );
}
