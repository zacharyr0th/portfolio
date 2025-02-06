import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/core/logger";
import { AppError } from "@/lib/utils/core/error-handling";
import crypto from "crypto";

// Security headers for development
const securityHeaders: Record<string, string | string[]> =
  process.env.NODE_ENV === "development"
    ? {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      }
    : {
        "Content-Security-Policy": [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https: blob:",
          "font-src 'self' data:",
          "connect-src 'self' https: wss:",
          "frame-ancestors 'none'",
        ].join("; "),
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Resource-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
        "Strict-Transport-Security":
          "max-age=31536000; includeSubDomains; preload",
      };

// CORS headers
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Helper to create wallet config
const createWalletConfig = (
  id: string,
  name: string,
  chain: string,
  publicKey: string,
) => ({
  id,
  name,
  type: "wallet",
  chain,
  status: "active",
  publicKey,
  value: 0,
  lastUpdated: new Date().toISOString(),
});

// Function to dynamically generate wallet configurations from environment variables
function generateWalletConfigs() {
  const walletConfigs = {
    solana: {} as Record<string, any>,
    aptos: {} as Record<string, any>,
    sui: {} as Record<string, any>,
    ethereum: {} as Record<string, any>,
    polygon: {} as Record<string, any>,
    arbitrum: {} as Record<string, any>,
    optimism: {} as Record<string, any>,
    base: {} as Record<string, any>,
  };

  // Get all environment variables
  const envVars = process.env || {};

  // Debug log all environment variables
  logger.debug("All environment variables:", {
    all: Object.keys(envVars),
    wallet: Object.keys(envVars).filter((key) => key.includes("WALLET")),
    solana: Object.keys(envVars).filter((key) =>
      key.startsWith("SOLANA_WALLET"),
    ),
    aptos: Object.keys(envVars).filter((key) => key.startsWith("APTOS_WALLET")),
    sui: Object.keys(envVars).filter((key) => key.startsWith("SUI_WALLET")),
    eth: Object.keys(envVars).filter((key) => key.startsWith("ETH_WALLET")),
    polygon: Object.keys(envVars).filter((key) =>
      key.startsWith("POLYGON_WALLET"),
    ),
    arbitrum: Object.keys(envVars).filter((key) =>
      key.startsWith("ARBITRUM_WALLET"),
    ),
    optimism: Object.keys(envVars).filter((key) =>
      key.startsWith("OPTIMISM_WALLET"),
    ),
    base: Object.keys(envVars).filter((key) => key.startsWith("BASE_WALLET")),
  });

  // Process each environment variable for wallets
  Object.entries(envVars).forEach(([key, value]) => {
    logger.debug(`Processing env var: ${key}=${value}`);

    if (
      !value ||
      value === "your_solana_wallet_address" ||
      value === "your_aptos_wallet_address" ||
      value === "your_sui_wallet_address" ||
      value === "your_eth_wallet_address"
    ) {
      logger.debug(`Skipping placeholder wallet value for ${key}`);
      return;
    }

    // Match wallet public keys by prefix
    const solanaMatch = key.match(/^SOLANA_WALLET_(.+)$/);
    const aptosMatch = key.match(/^APTOS_WALLET_(.+)$/);
    const suiMatch = key.match(/^SUI_WALLET_(.+)$/);
    const ethMatch = key.match(/^ETH_WALLET_(.+)$/);
    const polygonMatch = key.match(/^POLYGON_WALLET_(.+)$/);
    const arbitrumMatch = key.match(/^ARBITRUM_WALLET_(.+)$/);
    const optimismMatch = key.match(/^OPTIMISM_WALLET_(.+)$/);
    const baseMatch = key.match(/^BASE_WALLET_(.+)$/);

    try {
      if (solanaMatch?.[1]) {
        const name = solanaMatch[1]; // Use the exact name from env var
        const id = `sol-${name.toLowerCase()}`;
        walletConfigs.solana[id] = createWalletConfig(
          id,
          name,
          "solana",
          value,
        );
        logger.debug(`Created Solana wallet config:`, {
          id,
          name,
          publicKey: value,
        });
      } else if (aptosMatch?.[1]) {
        const name = aptosMatch[1];
        const id = `apt-${name.toLowerCase()}`;
        walletConfigs.aptos[id] = createWalletConfig(id, name, "aptos", value);
        logger.debug(`Created Aptos wallet config:`, {
          id,
          name,
          publicKey: value,
        });
      } else if (suiMatch?.[1]) {
        const name = suiMatch[1];
        const id = `sui-${name.toLowerCase()}`;
        walletConfigs.sui[id] = createWalletConfig(id, name, "sui", value);
        logger.debug(`Created Sui wallet config:`, {
          id,
          name,
          publicKey: value,
        });
      } else if (ethMatch?.[1]) {
        const name = ethMatch[1];
        const id = `eth-${name.toLowerCase()}`;
        walletConfigs.ethereum[id] = createWalletConfig(
          id,
          name,
          "ethereum",
          value,
        );
        logger.debug(`Created Ethereum wallet config:`, {
          id,
          name,
          publicKey: value,
        });
      } else if (polygonMatch?.[1]) {
        const name = polygonMatch[1];
        const id = `polygon-${name.toLowerCase()}`;
        walletConfigs.polygon[id] = createWalletConfig(
          id,
          name,
          "polygon",
          value,
        );
        logger.debug(`Created Polygon wallet config:`, {
          id,
          name,
          publicKey: value,
        });
      } else if (arbitrumMatch?.[1]) {
        const name = arbitrumMatch[1];
        const id = `arbitrum-${name.toLowerCase()}`;
        walletConfigs.arbitrum[id] = createWalletConfig(
          id,
          name,
          "arbitrum",
          value,
        );
        logger.debug(`Created Arbitrum wallet config:`, {
          id,
          name,
          publicKey: value,
        });
      } else if (optimismMatch?.[1]) {
        const name = optimismMatch[1];
        const id = `optimism-${name.toLowerCase()}`;
        walletConfigs.optimism[id] = createWalletConfig(
          id,
          name,
          "optimism",
          value,
        );
        logger.debug(`Created Optimism wallet config:`, {
          id,
          name,
          publicKey: value,
        });
      } else if (baseMatch?.[1]) {
        const name = baseMatch[1];
        const id = `base-${name.toLowerCase()}`;
        walletConfigs.base[id] = createWalletConfig(id, name, "base", value);
        logger.debug(`Created Base wallet config:`, {
          id,
          name,
          publicKey: value,
        });
      }
    } catch (error) {
      logger.error(
        `Error creating wallet config for ${key}:`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  });

  // Log final configurations
  logger.debug("Generated wallet configurations:", {
    solanaCount: Object.keys(walletConfigs.solana).length,
    aptosCount: Object.keys(walletConfigs.aptos).length,
    suiCount: Object.keys(walletConfigs.sui).length,
    ethereumCount: Object.keys(walletConfigs.ethereum).length,
    polygonCount: Object.keys(walletConfigs.polygon).length,
    arbitrumCount: Object.keys(walletConfigs.arbitrum).length,
    optimismCount: Object.keys(walletConfigs.optimism).length,
    baseCount: Object.keys(walletConfigs.base).length,
    solanaKeys: Object.keys(walletConfigs.solana),
    ethereumKeys: Object.keys(walletConfigs.ethereum),
  });

  return walletConfigs;
}

// Get account configurations
export async function GET() {
  const requestId = crypto.randomBytes(32).toString("base64");

  try {
    // Generate wallet configurations dynamically
    const walletConfigs = generateWalletConfigs();

    // Log the generated configurations for debugging
    logger.debug("Generated wallet configurations:", {
      requestId,
      walletCount: {
        solana: Object.keys(walletConfigs.solana).length,
        aptos: Object.keys(walletConfigs.aptos).length,
        sui: Object.keys(walletConfigs.sui).length,
        ethereum: Object.keys(walletConfigs.ethereum).length,
        polygon: Object.keys(walletConfigs.polygon).length,
        arbitrum: Object.keys(walletConfigs.arbitrum).length,
        optimism: Object.keys(walletConfigs.optimism).length,
        base: Object.keys(walletConfigs.base).length,
      },
      solanaWallets: Object.values(walletConfigs.solana).map(
        (w) => w.publicKey,
      ),
      ethereumWallets: Object.values(walletConfigs.ethereum).map(
        (w) => w.publicKey,
      ),
    });

    // Return the configurations
    return NextResponse.json(walletConfigs, {
      status: 200,
      headers: new Headers({
        ...corsHeaders,
        "X-Request-ID": requestId,
      }),
    });
  } catch (error) {
    const err =
      error instanceof Error ? error : new Error("Unknown error occurred");
    logger.error("Error fetching account configurations", err, { requestId });

    return NextResponse.json(
      { error: err.message },
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "X-Request-ID": requestId,
        },
      },
    );
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: new Headers(corsHeaders),
    },
  );
}
