import React from "react";
import { cn } from "@/lib/utils";
import type { ChainType } from "@/app/components/accounts/cards/types";
import type {
  PlatformUrls,
  BankPlatform,
  BrokerPlatform,
  CexPlatform,
  CreditPlatform,
  DebitPlatform,
  WalletAccount,
  CreditAccount,
  DebitAccount,
} from "./types";
import { logger } from "@/lib/utils/core/logger";
import { creditAccounts } from "../config";

// UI Components
interface LastUpdatedProps {
  readonly date: string | Date;
  readonly className?: string;
}

export const LastUpdated = React.memo(function LastUpdated({
  date,
  className,
}: LastUpdatedProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className="font-medium min-w-[4.5rem]">Updated:</span>
      <span className="text-[10px] sm:text-xs">{formatLastUpdated(date)}</span>
    </div>
  );
});

LastUpdated.displayName = "LastUpdated";

// Account type styles for consistent theming across components
export const ACCOUNT_TYPE_STYLES = {
  wallet: {
    bgColor: "bg-[hsl(220,13%,12%)]",
    accentColor: "border-[hsl(220,13%,20%)] hover:border-[hsl(220,13%,25%)]",
    badgeClass: "bg-[hsl(220,13%,30%)] text-[hsl(220,13%,80%)]",
    label: "Wallet",
  },
  cex: {
    bgColor: "bg-[hsl(270,20%,12%)]",
    accentColor: "border-[hsl(270,20%,20%)] hover:border-[hsl(270,20%,25%)]",
    badgeClass: "bg-[hsl(270,20%,30%)] text-[hsl(270,20%,80%)]",
    label: "Exchange",
  },
  broker: {
    bgColor: "bg-[hsl(210,20%,12%)]",
    accentColor: "border-[hsl(210,20%,20%)] hover:border-[hsl(210,20%,25%)]",
    badgeClass: "bg-[hsl(210,20%,30%)] text-[hsl(210,20%,80%)]",
    label: "Broker",
  },
  bank: {
    bgColor: "bg-[hsl(150,20%,12%)]",
    accentColor: "border-[hsl(150,20%,20%)] hover:border-[hsl(150,20%,25%)]",
    badgeClass: "bg-[hsl(150,20%,30%)] text-[hsl(150,20%,80%)]",
    label: "Bank",
  },
  credit: {
    bgColor: "bg-[hsl(0,20%,12%)]",
    accentColor: "border-[hsl(0,20%,20%)] hover:border-[hsl(0,20%,25%)]",
    badgeClass: "bg-[hsl(0,20%,30%)] text-[hsl(0,20%,80%)]",
    label: "Credit",
  },
  debit: {
    bgColor: "bg-[hsl(40,20%,12%)]",
    accentColor: "border-[hsl(40,20%,20%)] hover:border-[hsl(40,20%,25%)]",
    badgeClass: "bg-[hsl(40,20%,30%)] text-[hsl(40,20%,80%)]",
    label: "Debit",
  },
} as const;

// Category descriptions for broker accounts
export const CATEGORY_DESCRIPTIONS = {
  wallet: "Self-custodial blockchain wallet for managing digital assets",
  cex: "Centralized cryptocurrency exchange account",
  broker: "Traditional investment and trading account",
  bank: "Traditional banking and savings account",
  credit: "Credit card account for purchases and payments",
  debit: "Debit card linked to checking account",
} as const;

// Priority order for debit platforms
const DEBIT_PLATFORM_PRIORITY: Record<DebitPlatform, number> = {
  Chase: 1,
  "Wells Fargo": 2,
  SoFi: 3,
  Fidelity: 4,
  Venmo: 5,
} as const;

export const getPrioritizedDebitAccounts = <
  T extends { platform: DebitPlatform },
>(
  accounts: T[],
): T[] => {
  return [...accounts].sort((a, b) => {
    const priorityA =
      DEBIT_PLATFORM_PRIORITY[a.platform] || Number.MAX_SAFE_INTEGER;
    const priorityB =
      DEBIT_PLATFORM_PRIORITY[b.platform] || Number.MAX_SAFE_INTEGER;
    return priorityA - priorityB;
  });
};

// Chain icons with improved type safety
export const CHAIN_ICONS = {
  aptos: { src: "/icons/chain-icons/aptos.webp", opacity: 90 },
  solana: { src: "/icons/chain-icons/solana.webp", opacity: 90 },
  sui: { src: "/icons/chain-icons/sui.webp", opacity: 90 },
  ethereum: { src: "/icons/chain-icons/ethereum.webp", opacity: 90 },
  "eth-main": { src: "/icons/chain-icons/ethereum.webp", opacity: 90 },
  polygon: { src: "/icons/chain-icons/polygon.webp", opacity: 90 },
  "polygon-main": { src: "/icons/chain-icons/polygon.webp", opacity: 90 },
  arbitrum: { src: "/icons/chain-icons/arbitrum.webp", opacity: 90 },
  "arbitrum-main": { src: "/icons/chain-icons/arbitrum.webp", opacity: 90 },
  optimism: { src: "/icons/chain-icons/optimism.webp", opacity: 90 },
  "optimism-main": { src: "/icons/chain-icons/optimism.webp", opacity: 90 },
  base: { src: "/icons/chain-icons/base.webp", opacity: 90 },
  "base-main": { src: "/icons/chain-icons/base.webp", opacity: 90 },
  sei: { src: "/icons/chain-icons/sei.webp", opacity: 90 },
} as const;

export const PLATFORM_ICONS: Readonly<
  Record<string, { src: string; opacity?: number }>
> = {
  // CEX Platforms
  Kraken: { src: "/icons/cex-icons/kraken.webp", opacity: 90 },
  Gemini: { src: "/icons/cex-icons/gemini.webp", opacity: 90 },
  Coinbase: { src: "/icons/unused-icons/coinbase.webp", opacity: 90 },

  // Broker Platforms
  Fidelity: { src: "/icons/unused-icons/fidelity.webp", opacity: 90 },
  Schwab: { src: "/icons/account-icons/schwab.webp", opacity: 90 },
  Robinhood: { src: "/icons/account-icons/robinhood.webp", opacity: 90 },
  "E*TRADE": { src: "/icons/account-icons/etrade.webp", opacity: 90 },
  Tradovate: { src: "/icons/account-icons/tradovate.webp", opacity: 90 },
  Carta: { src: "/icons/account-icons/carta.webp", opacity: 90 },
  Magna: { src: "/icons/account-icons/magna.webp", opacity: 90 },

  // Bank & Payment Platforms
  Chase: { src: "/icons/unused-icons/chase.webp", opacity: 90 },
  SoFi: { src: "/icons/account-icons/sofi.webp", opacity: 90 },
  Betterment: { src: "/icons/unused-icons/betterment.webp", opacity: 90 },
  "TD Auto Finance": {
    src: "/icons/account-icons/td-auto-finance.webp",
    opacity: 90,
  },
  Apple: { src: "/icons/unused-icons/apple.webp", opacity: 90 },
} as const;

export const TOKEN_ICONS: Readonly<
  Record<string, { src: string; opacity?: number }>
> = {
  USDC: { src: "/icons/unused-icons/usdc.webp" },
  USDT: { src: "/icons/unused-icons/usdt.webp" },
  SOL: { src: "/icons/chain-icons/solana.webp" },
  APT: { src: "/icons/chain-icons/aptos.webp" },
  SUI: { src: "/icons/chain-icons/sui.webp" },
  ETH: { src: "/icons/chain-icons/ethereum.webp" },
} as const;

// Platform URLs for each account type with improved type safety
export const PLATFORM_URLS: Readonly<PlatformUrls> = {
  bank: {
    Chase: "https://www.chase.com",
    SoFi: "https://www.sofi.com",
    Fidelity: "https://www.fidelity.com",
    Betterment: "https://www.betterment.com",
    "Wells Fargo": "https://www.wellsfargo.com",
    "Lead Bank": "https://www.lead.bank",
  },
  broker: {
    Fidelity: "https://www.fidelity.com",
    Schwab: "https://www.schwab.com",
    Robinhood: "https://robinhood.com",
    Tradovate: "https://www.tradovate.com",
    Carta: "https://carta.com",
    Magna: "https://magna.com",
  },
  cex: {
    Kraken: "https://www.kraken.com",
    Gemini: "https://www.gemini.com",
    Coinbase: "https://www.coinbase.com",
  },
  credit: {
    Chase: "https://www.chase.com",
    Apple: "https://card.apple.com",
    "TD Auto Finance": "https://www.tdautofinance.com",
    "Wells Fargo": "https://www.wellsfargo.com",
  },
  debit: {
    Chase: "https://www.chase.com",
    SoFi: "https://www.sofi.com",
    Fidelity: "https://www.fidelity.com",
    "Wells Fargo": "https://www.wellsfargo.com",
    Venmo: "https://venmo.com",
  },
} as const;

// Caches for memoized functions
const formatters = new Map<string, Intl.DateTimeFormat>(); // formatters
const chainIconCache = new Map<ChainType, { src: string; opacity: number }>(); // chain icons
const platformIconCache = new Map<string, { src: string; opacity?: number }>(); // platform icons
const tokenIconCache = new Map<string, { src: string; opacity?: number }>(); // token icons

// Helper functions for UI components with memoization
export const getChainIcon = (chain: ChainType) => {
  if (!chainIconCache.has(chain)) {
    chainIconCache.set(chain, CHAIN_ICONS[chain]);
  }
  return chainIconCache.get(chain);
};
export const getPlatformIcon = (
  platform:
    | BankPlatform
    | BrokerPlatform
    | CexPlatform
    | CreditPlatform
    | DebitPlatform,
) => {
  const icon = PLATFORM_ICONS[platform];
  if (icon && !platformIconCache.has(platform)) {
    platformIconCache.set(platform, icon);
  }
  return platformIconCache.get(platform) || icon;
};
export const getTokenIcon = (symbol: string) => {
  const icon = TOKEN_ICONS[symbol];
  if (icon && !tokenIconCache.has(symbol)) {
    tokenIconCache.set(symbol, icon);
  }
  return tokenIconCache.get(symbol) || icon;
};
export const formatLastUpdated = (date: string | Date) => {
  const key = "lastUpdated";
  if (!formatters.has(key)) {
    formatters.set(
      key,
      new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false,
      }),
    );
  }
  return formatters.get(key)!.format(new Date(date));
};

// Wallet account utility functions with memoization
const addressFormatCache = new Map<string, string>(); // address format cache
// Format address utility function with memoization
export const formatAddress = (address: string, chain: ChainType): string => {
  const cacheKey = `${chain}-${address}`;
  if (addressFormatCache.has(cacheKey)) {
    return addressFormatCache.get(cacheKey)!;
  }

  let formattedAddress = "";
  if (!address) {
    formattedAddress = "";
  } else if (chain === "aptos") {
    let cleanAddress = address.trim().toLowerCase();
    cleanAddress = cleanAddress.startsWith("0x")
      ? cleanAddress
      : `0x${cleanAddress}`;
    if (cleanAddress.length !== 66) {
      logger.warn(`Invalid Aptos address length: ${cleanAddress}`);
    }
    formattedAddress = cleanAddress;
  } else {
    formattedAddress = chain === "solana" ? address : address;
  }

  addressFormatCache.set(cacheKey, formattedAddress);
  return formattedAddress;
};

// Cache for chain balance distribution
const chainBalanceCache = new Map<string, WalletAccount[]>();
export const distributeChainBalance = (
  wallets: WalletAccount[],
  chain: ChainType,
): WalletAccount[] => {
  const cacheKey = `${chain}-${wallets.map((w) => w.id).join("-")}`;
  if (chainBalanceCache.has(cacheKey)) {
    return chainBalanceCache.get(cacheKey)!;
  }
  const result = wallets.filter(
    (w) => w.chain === chain && w.status === "active",
  );
  chainBalanceCache.set(cacheKey, result);
  return result;
};

// Cache for prioritized accounts
const prioritizedAccountsCache = {
  debit: null as Pick<DebitAccount, "id" | "name" | "priority">[] | null,
  credit: null as
    | Pick<CreditAccount, "id" | "name" | "priority" | "rewards">[]
    | null,
};

// Get prioritized credit accounts with memoization
export const getPrioritizedCreditAccounts = (): Pick<
  CreditAccount,
  "id" | "name" | "priority" | "rewards"
>[] => {
  if (!prioritizedAccountsCache.credit) {
    prioritizedAccountsCache.credit = Object.values(
      creditAccounts as Record<string, CreditAccount>,
    )
      .sort((a, b) => (a.priority || 99) - (b.priority || 99))
      .map((account) => ({
        id: account.id,
        name: account.name,
        priority: account.priority,
        rewards: account.rewards,
      }));
  }
  return prioritizedAccountsCache.credit;
};

// Cache for credit metrics
let creditMetricsCache: {
  totalCreditLimit: number;
  totalBalance: number;
  averageAPR: number;
  utilizationRate: number;
} | null = null;

export const getCreditMetrics = (): {
  totalCreditLimit: number;
  totalBalance: number;
  averageAPR: number;
  utilizationRate: number;
} => {
  if (creditMetricsCache) {
    return creditMetricsCache;
  }

  const accounts = Object.values(
    creditAccounts as Record<string, CreditAccount>,
  );
  if (accounts.length === 0) {
    creditMetricsCache = {
      totalCreditLimit: 0,
      totalBalance: 0,
      averageAPR: 0,
      utilizationRate: 0,
    };
    return creditMetricsCache;
  }

  const metrics = {
    totalCreditLimit: accounts.reduce(
      (sum, account) => sum + account.creditLimit,
      0,
    ),
    totalBalance: accounts.reduce(
      (sum, account) => sum + Math.abs(account.value),
      0,
    ),
    averageAPR:
      accounts.reduce((sum, account) => sum + account.apr, 0) / accounts.length,
  };

  creditMetricsCache = {
    ...metrics,
    utilizationRate: metrics.totalBalance / metrics.totalCreditLimit,
  };

  return creditMetricsCache;
};

// Cache cleanup function
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

const cleanupCaches = () => {
  addressFormatCache.clear();
  chainBalanceCache.clear();
  prioritizedAccountsCache.debit = null;
  prioritizedAccountsCache.credit = null;
  creditMetricsCache = null;
};

// Set up periodic cache cleanup
if (typeof window !== "undefined") {
  setInterval(cleanupCaches, CACHE_CLEANUP_INTERVAL);
}
