import { NextResponse } from "next/server";
import axios from "axios";
import { logger } from "@/lib/utils/core/logger";

// Base QuickNode endpoint configuration
const QUICKNODE_TOKEN = "d65fe35c722255c7db2360e2e4af15621db7a4db";
const QUICKNODE_ENDPOINT = "necessary-old-flower";

// Sei-specific error codes
const SEI_ERROR_CODES = {
  "-32000": "Not Found",
  "-32001": "Invalid Parameters",
  "-32002": "Method Not Found",
  "-32003": "Invalid Request",
  "-32004": "Parse Error",
  "-32005": "Internal Error",
} as const;

// Chain-specific configurations
const CHAINS = {
  SEI: {
    subdomain: "sei-pacific",
    methods: {
      // Standard EVM methods
      blockNumber: {
        method: "eth_blockNumber",
        params: [],
      },
      // Sei Address methods
      getSeiAddress: {
        method: "sei_getSeiAddress",
        params: ["0x5cb8491452dab1b31526edf5fabd9d7b56e616d9"],
        description: "Get Sei address from EVM address",
      },
      getEvmAddress: {
        method: "sei_getEVMAddress",
        params: ["sei1m9zk5qjmhezdtyjqzq9nez26h3e3cg42fk0n8d"],
        description: "Get EVM address from Sei address",
      },
      // Transaction methods
      getEvmTx: {
        method: "sei_getEvmTx",
        params: [
          "3BAE4FEE4C8E7658F57A34B53C48A56771F3A427C3674136C4DBA152FE8F3823",
        ],
        description: "Get EVM transaction hash from Cosmos transaction hash",
      },
      getCosmosTx: {
        method: "sei_getCosmosTx",
        params: [
          "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        ],
        description: "Get Cosmos transaction hash from EVM transaction hash",
      },
      // Chain state methods
      getLatestBlockHeight: {
        method: "sei_getLatestBlockHeight",
        params: [],
        description: "Get latest block height",
      },
      getChainId: {
        method: "sei_getChainId",
        params: [],
        description: "Get chain ID",
      },
      // Account methods
      getBalance: {
        method: "sei_getBalance",
        params: ["sei1m9zk5qjmhezdtyjqzq9nez26h3e3cg42fk0n8d"],
        description: "Get account balance",
      },
      getAccount: {
        method: "sei_getAccount",
        params: ["sei1m9zk5qjmhezdtyjqzq9nez26h3e3cg42fk0n8d"],
        description: "Get account details",
      },
    },
  },
  ETHEREUM: {
    subdomain: "", // No subdomain for Ethereum mainnet
    methods: {
      blockNumber: {
        method: "eth_blockNumber",
        params: [],
      },
    },
  },
  SOLANA: {
    subdomain: "solana-mainnet",
    methods: {
      blockHeight: {
        method: "getBlockHeight",
        params: [],
      },
    },
  },
  BSC: {
    subdomain: "bsc",
    methods: {
      blockNumber: {
        method: "eth_blockNumber",
        params: [],
      },
    },
  },
  BASE: {
    subdomain: "base-mainnet",
    methods: {
      blockNumber: {
        method: "eth_blockNumber",
        params: [],
      },
    },
  },
} as const;

// Security headers
const SECURITY_HEADERS = {
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
};

// Route configuration
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Helper to get chain URL
function getChainUrl(chain: keyof typeof CHAINS): string {
  const { subdomain } = CHAINS[chain];
  return subdomain
    ? `https://${QUICKNODE_ENDPOINT}.${subdomain}.quiknode.pro/${QUICKNODE_TOKEN}/`
    : `https://${QUICKNODE_ENDPOINT}.quiknode.pro/${QUICKNODE_TOKEN}/`;
}

// Helper to handle Sei-specific errors
function handleSeiError(error: unknown): { success: false; error: string } {
  if (axios.isAxiosError(error) && error.response?.data?.error) {
    const { code, message } = error.response.data.error;
    const knownError = SEI_ERROR_CODES[code as keyof typeof SEI_ERROR_CODES];
    return {
      success: false,
      error: knownError
        ? `${knownError}: ${message}`
        : message || "Unknown Sei error",
    };
  }
  return {
    success: false,
    error: error instanceof Error ? error.message : "Unknown error",
  };
}

// Helper to make RPC call
async function makeRpcCall(chain: keyof typeof CHAINS, methodName: string) {
  const url = getChainUrl(chain);
  const chainConfig = CHAINS[chain];
  const methodConfig =
    chainConfig.methods[methodName as keyof typeof chainConfig.methods];

  if (!methodConfig) {
    throw new Error(`Method ${methodName} not found for chain ${chain}`);
  }

  try {
    const response = await axios({
      method: "POST",
      url,
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        method: methodConfig.method,
        params: methodConfig.params,
        id: 1,
        jsonrpc: "2.0",
      },
    });

    // Check for Sei-specific error in successful response
    if (chain === "SEI" && response.data.error) {
      return {
        chain,
        method: methodName,
        ...handleSeiError(response.data),
      };
    }

    return {
      chain,
      method: methodName,
      success: true,
      data: response.data,
      result:
        methodConfig.method === "eth_blockNumber"
          ? parseInt(response.data.result, 16)
          : response.data.result,
      description: methodConfig.description,
    };
  } catch (error) {
    logger.error(`${chain} RPC test error for method ${methodName}:`, error);
    return {
      chain,
      method: methodName,
      ...(chain === "SEI"
        ? handleSeiError(error)
        : {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          }),
    };
  }
}

// GET handler to test QuickNode RPC connections
export async function GET(req: Request) {
  try {
    // Get chain and method parameters from URL
    const { searchParams } = new URL(req.url);
    const chain = searchParams.get("chain")?.toUpperCase() as
      | keyof typeof CHAINS
      | null;
    const method = searchParams.get("method")?.toLowerCase();

    // If chain specified
    if (chain && chain in CHAINS) {
      // If method specified, test only that method
      if (method && method in CHAINS[chain].methods) {
        const result = await makeRpcCall(chain, method);
        return NextResponse.json(result, {
          status: result.success ? 200 : 400,
          headers: SECURITY_HEADERS,
        });
      }

      // Otherwise test all methods for the chain
      const results = await Promise.all(
        Object.keys(CHAINS[chain].methods).map((methodName) =>
          makeRpcCall(chain, methodName),
        ),
      );

      return NextResponse.json(
        {
          success: true,
          results,
        },
        {
          headers: SECURITY_HEADERS,
        },
      );
    }

    // Otherwise test all chains and their methods
    const results = await Promise.all(
      Object.entries(CHAINS).flatMap(([chainName, chainConfig]) =>
        Object.keys(chainConfig.methods).map((methodName) =>
          makeRpcCall(chainName as keyof typeof CHAINS, methodName),
        ),
      ),
    );

    return NextResponse.json(
      {
        success: true,
        results,
      },
      {
        headers: SECURITY_HEADERS,
      },
    );
  } catch (error) {
    const err =
      error instanceof Error ? error : new Error("Internal server error");
    logger.error("QuickNode multichain test error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      {
        status: error instanceof Error ? 400 : 500,
        headers: SECURITY_HEADERS,
      },
    );
  }
}
