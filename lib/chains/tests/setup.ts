import { config } from "dotenv";
import path from "path";
import { logger } from "@/lib/utils/core/logger";

// Load environment variables in order of priority
config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env.test") });
config({ path: path.resolve(process.cwd(), ".env") });

// Required environment variables for tests
const requiredEnvVars = [
  "SIMPLEHASH_API_KEY",
  "NEXT_PUBLIC_ETH_RPC_URL",
  "NEXT_PUBLIC_POLYGON_RPC_URL",
  "NEXT_PUBLIC_ARBITRUM_RPC_URL",
  "NEXT_PUBLIC_OPTIMISM_RPC_URL",
  "NEXT_PUBLIC_BASE_RPC_URL",
  "APTOS_RPC_URL",
  "SOLANA_RPC_URL",
  "SUI_RPC_URL",
  "TEZOS_RPC_URL",
];

// Check for required environment variables
const missingVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
if (missingVars.length > 0) {
  logger.warn(
    `Missing required environment variables for tests: ${missingVars.join(", ")}`,
  );
  logger.warn("Some tests may fail or be skipped due to missing configuration");
}

// Global test configuration
jest.setTimeout(30000); // 30 second timeout for all tests
