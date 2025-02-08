import { useState, useCallback, useEffect } from "react";
import { BaseCard } from "../BaseCard";
import { TokenBalance } from "../TokenBalance";
import { Copy, Check, ExternalLink, Image as ImageIcon } from "lucide-react";
import {
  CHAIN_CONFIG,
  isEvmChain,
  TOKEN_SUPPORTED_CHAINS,
  NFT_SUPPORTED_CHAINS,
  type ChainType,
} from "@/lib/chains/constants";
import type { WalletAccount } from "../types";
import { useLocalStorage } from "@/lib/utils/hooks/useLocalStorage";
import { logger } from "@/lib/utils/core/logger";
import { NftModal } from "../modals/NftModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EvmCardProps {
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
      chainId: number;
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
  } else {
    return num.toFixed(2);
  }
}

// Add utility function for shortening addresses
function shortenAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Type guard for supported chain types in TokenBalance
type SupportedTokenBalanceChain =
  | "ethereum"
  | "polygon"
  | "arbitrum"
  | "base"
  | "optimism";
const SUPPORTED_TOKEN_BALANCE_CHAINS: readonly SupportedTokenBalanceChain[] = [
  "ethereum",
  "polygon",
  "arbitrum",
  "base",
  "optimism",
] as const;

function isSupportedTokenBalanceChain(
  chain: string,
): chain is SupportedTokenBalanceChain {
  return SUPPORTED_TOKEN_BALANCE_CHAINS.includes(
    chain as SupportedTokenBalanceChain,
  );
}

// Define supported EVM chains
type EvmChainType = Extract<ChainType, SupportedTokenBalanceChain>;

const supportedChains = Object.entries(CHAIN_CONFIG)
  .filter(([chain]) => {
    const chainType = chain as ChainType;
    // Check if it's both an EVM chain and supports token balances
    return isEvmChain(chainType) && chainType in TOKEN_SUPPORTED_CHAINS;
  })
  .map(([id, config]) => ({
    id: id as EvmChainType,
    name: config.name,
  }));

// Get initial chain from account chain or default to ethereum
const getInitialChain = (accountChain: string): EvmChainType => {
  const normalizedChain = accountChain
    .toLowerCase()
    .replace("-main", "") as ChainType;
  return Object.keys(CHAIN_CONFIG).includes(normalizedChain) &&
    isEvmChain(normalizedChain as ChainType)
    ? (normalizedChain as EvmChainType)
    : "ethereum";
};

// Helper function to check if a chain supports both tokens and NFTs
const supportsTokensAndNfts = (chain: ChainType): boolean => {
  return chain in TOKEN_SUPPORTED_CHAINS && chain in NFT_SUPPORTED_CHAINS;
};

export function EvmCard({
  account,
  compact = false,
  isExpanded = false,
  onUpdateValue,
  showHiddenTokens = false,
}: EvmCardProps) {
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
  const [selectedChain, setSelectedChain] = useState<EvmChainType>(() =>
    getInitialChain(account.chain),
  );

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(account.publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [account.publicKey]);

  const getExplorerUrl = useCallback((walletAccount: WalletAccount) => {
    const { chain, publicKey } = walletAccount;
    const chainConfig = CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG];
    if (chainConfig) {
      return `${chainConfig.explorerUrl}/address/${publicKey}`;
    }
    return "#";
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

      const chainName = selectedChain.replace("-main", "");
      const response = await fetch(
        `/api/evm/balance?address=${account.publicKey}&chain=${chainName}`,
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch balances");
      }

      const data = await response.json();

      // Normalize the price data to ensure correct values
      const normalizedPrices = Object.fromEntries(
        Object.entries(
          data.prices as Record<string, { price: number; timestamp: number }>,
        ).map(([symbol, priceData]) => [
          symbol,
          {
            price: Number(priceData.price),
            timestamp: priceData.timestamp,
          },
        ]),
      );

      setTokenData({
        balances: data.balances,
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
      logger.error("Error fetching EVM balances:", new Error(message));
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [account.publicKey, account.id, onUpdateValue, selectedChain]);

  // Fetch balances on mount and when expanded
  useEffect(() => {
    if (isOpen) {
      fetchBalances();
      const intervalId = setInterval(fetchBalances, 300000); // Refresh every 5 minutes
      return () => clearInterval(intervalId);
    }
    return undefined;
  }, [isOpen, fetchBalances]);

  // Handle expanded state changes from parent
  useEffect(() => {
    setIsOpen(isExpanded);
  }, [isExpanded]);

  const handleChainChange = (newChain: EvmChainType) => {
    setSelectedChain(newChain);
    // This will trigger a re-fetch due to the dependency in fetchBalances
  };

  return (
    <>
      <BaseCard
        account={{
          ...account,
          chain: selectedChain,
          value: tokenData.balances.reduce((sum, balance) => {
            const price = tokenData.prices[balance.token.symbol]?.price || 0;
            return sum + balance.uiAmount * price;
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
            <div className="flex items-center justify-between gap-2">
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
                  href={getExplorerUrl({ ...account, chain: selectedChain })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-accent rounded-md transition-colors"
                  aria-label="View on explorer"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
              </div>
              <Select value={selectedChain} onValueChange={handleChainChange}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Select chain" />
                </SelectTrigger>
                <SelectContent>
                  {supportedChains.map((chain) => (
                    <SelectItem
                      key={chain.id}
                      value={chain.id}
                      className="text-xs"
                    >
                      {chain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {tokenData.balances.map((balance) => {
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
                    key={`${account.id}-${balance.token.address}-${balance.token.symbol}`}
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
                    chainType={
                      isSupportedTokenBalanceChain(selectedChain)
                        ? selectedChain
                        : undefined
                    }
                  />
                );
              })}
            </div>
            {supportsTokensAndNfts(selectedChain) && (
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => setShowNftModal(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  View NFTs
                </button>
              </div>
            )}
          </div>
        )}
      </BaseCard>

      {supportsTokensAndNfts(selectedChain) && (
        <NftModal
          isOpen={showNftModal}
          onClose={() => setShowNftModal(false)}
          walletAddress={account.publicKey}
          chain={account.chain}
        />
      )}
    </>
  );
}
