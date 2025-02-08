import type {
  BankAccount,
  BrokerAccount,
  CexAccount,
  CreditAccount,
  DebitAccount,
  WalletAccount,
} from "./types";
import { CexCard } from "./crypto/CexCard";
import { BrokerCard } from "./tradfi/BrokerCard";
import { BankCard } from "./tradfi/BankCard";
import { CreditCard } from "./tradfi/CreditCard";
import { DebitCard } from "./tradfi/DebitCard";
import { EvmCard } from "./crypto/EvmCard";
import { SolanaCard } from "./crypto/SolanaCard";
import { AptosCard } from "./crypto/AptosCard";
import { SuiCard } from "./crypto/SuiCard";
import { SeiCard } from "./crypto/SeiCard";
import type { SharedCardProps } from "./types";
import type {
  BankPlatform,
  BrokerPlatform,
  CexPlatform,
  CreditPlatform,
  DebitPlatform,
} from "./types";
import { isValidChain, type ChainType } from "@/lib/chains";
import { logger } from "@/lib/utils/core/logger";

// Re-export shared types and constants
export * from "./types";
export * from "./constants";

interface AccountCardProps extends SharedCardProps {
  showHiddenTokens?: boolean;
}

function assertWalletChain(account: WalletAccount) {
  if (!isValidChain(account.chain)) return null;

  // Map mainnet variants to base chain names
  const chainMap: Record<string, WalletAccount["chain"]> = {
    "eth-main": "ethereum",
    "polygon-main": "polygon",
    "arbitrum-main": "arbitrum",
    "optimism-main": "optimism",
    "base-main": "base",
  };

  const normalizedChain = chainMap[account.chain] || account.chain;
  return { ...account, chain: normalizedChain };
}

function assertBankPlatform(account: BankAccount) {
  return { ...account, platform: account.platform as BankPlatform };
}
function assertBrokerPlatform(account: BrokerAccount) {
  return { ...account, platform: account.platform as BrokerPlatform };
}
function assertCexPlatform(account: CexAccount) {
  return { ...account, platform: account.platform as CexPlatform };
}
function assertCreditPlatform(account: CreditAccount) {
  return { ...account, platform: account.platform as CreditPlatform };
}
function assertDebitPlatform(account: DebitAccount) {
  return { ...account, platform: account.platform as DebitPlatform };
}

export function AccountCard({ account, ...props }: AccountCardProps) {
  switch (account.type) {
    case "wallet": {
      const normalizedAccount = assertWalletChain(account);
      if (!normalizedAccount) {
        logger.error(`Invalid chain type for wallet: ${account.chain}`);
        return null;
      }

      // Handle L1 chains
      switch (normalizedAccount.chain) {
        case "solana":
          return <SolanaCard account={normalizedAccount} {...props} />;
        case "aptos":
          return <AptosCard account={normalizedAccount} {...props} />;
        case "sui":
          return <SuiCard account={normalizedAccount} {...props} />;
        case "sei":
          return <SeiCard account={normalizedAccount} {...props} />;
      }

      // Handle EVM chains
      const evmChains = [
        "ethereum",
        "polygon",
        "arbitrum",
        "arbitrum_nova",
        "avalanche",
        "base",
        "blast",
        "bsc",
        "canto",
        "celo",
        "fantom",
        "gnosis",
        "linea",
        "manta",
        "mantle",
        "mode",
        "moonbeam",
        "opbnb",
        "optimism",
        "polygon_zkevm",
        "scroll",
        "zksync_era",
        "zora",
      ] as const;

      if (evmChains.includes(normalizedAccount.chain as any)) {
        return <EvmCard account={normalizedAccount} {...props} />;
      }

      logger.error(`Unsupported chain type: ${normalizedAccount.chain}`);
      return null;
    }
    case "cex":
      return <CexCard account={account as CexAccount} {...props} />;
    case "broker":
      return (
        <BrokerCard
          account={
            account as Omit<BrokerAccount, "platform"> & {
              platform: BrokerPlatform;
            }
          }
          {...props}
        />
      );
    case "bank":
      return (
        <BankCard
          account={
            account as Omit<BankAccount, "platform"> & {
              platform: BankPlatform;
            }
          }
          {...props}
        />
      );
    case "credit":
      return (
        <CreditCard
          account={
            account as Omit<CreditAccount, "platform"> & {
              platform: CreditPlatform;
            }
          }
          {...props}
        />
      );
    case "debit":
      return (
        <DebitCard
          account={
            account as Omit<DebitAccount, "platform"> & {
              platform: DebitPlatform;
            }
          }
          {...props}
        />
      );
    default:
      logger.error(`Unsupported account type: ${(account as any).type}`);
      return null;
  }
}
