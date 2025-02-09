import type { ChainHandler } from "./types";
import { aptosHandler, clearCache as clearAptosCache } from "./aptos";
import { solanaHandler, clearCache as clearSolanaCache } from "./solana";
import { suiHandler, clearCache as clearSuiCache } from "./sui";
import { evmHandler, clearCache as clearEvmCache } from "./evm";
import { logger } from "@/lib/utils/core/logger";
import { ChainType } from "./types";
import { isValidChain } from "./config";

// Chain handlers with type safety
export const chainHandlers: Readonly<Record<ChainType, ChainHandler>> =
  Object.freeze({
    // Layer 1s
    aptos: aptosHandler,
    solana: solanaHandler,
    sui: suiHandler,
    ethereum: evmHandler,
    bitcoin: evmHandler,
    tezos: evmHandler,
    flow: evmHandler,
    flow_evm: evmHandler,
    sei: evmHandler,

    // EVM Layer 2s & Sidechains
    polygon: evmHandler,
    arbitrum: evmHandler,
    arbitrum_one: evmHandler,
    optimism: evmHandler,
    base: evmHandler,
    arbitrum_nova: evmHandler,
    avalanche: evmHandler,
    canto: evmHandler,
    fantom: evmHandler,
    blast: evmHandler,
    bsc: evmHandler,
    moonbeam: evmHandler,
    abstract: evmHandler,
    apechain: evmHandler,
    b3: evmHandler,
    forma: evmHandler,
    proof_of_play: evmHandler,
    proof_of_play_boss: evmHandler,
    rari: evmHandler,
    soneium: evmHandler,
    saakuru: evmHandler,
    shape: evmHandler,
    palm: evmHandler,
    cyber: evmHandler,
    mantle: evmHandler,
    scroll: evmHandler,
    zora: evmHandler,
    gnosis: evmHandler,
    godwoken: evmHandler,
    immutable_zkevm: evmHandler,
    linea: evmHandler,
    loot: evmHandler,
    manta: evmHandler,
    mode: evmHandler,
    opbnb: evmHandler,
    polygon_zkevm: evmHandler,
    treasure: evmHandler,
    xai: evmHandler,
    zksync_era: evmHandler,
  });

// Utility function to get a chain handler with type safety and error handling
export const getChainHandler = (chain: string): ChainHandler | null => {
  if (!chain) {
    logger.warn("No chain specified when getting chain handler");
    return null;
  }

  // Handle chain variations (e.g., 'eth-main' -> 'ethereum')
  const normalizedChain = chain.replace(/-main$/, "");

  if (!isValidChain(normalizedChain)) {
    logger.warn(`Unsupported chain requested: ${chain}`);
    return null;
  }

  const handler = chainHandlers[normalizedChain as ChainType];
  if (!handler) {
    logger.error(`Handler not found for supported chain: ${chain}`);
    return null;
  }

  return handler;
};

// Export cleanup function for tests and hot reloading
export const clearAllCaches = () => {
  try {
    clearAptosCache();
    clearSolanaCache();
    clearSuiCache();
    clearEvmCache();
    logger.debug("Successfully cleared all chain handler caches");
  } catch (error) {
    logger.error(
      `Error clearing chain handler caches: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

// Re-export types and config
export * from "./types";
export * from "./config";
