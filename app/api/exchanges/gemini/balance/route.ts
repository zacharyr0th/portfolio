import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/core/logger";
import { GeminiHandler } from "@/lib/exchanges/gemini";

export async function GET(): Promise<NextResponse> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const apiSecret = process.env.GEMINI_API_SECRET;

    logger.debug("Checking Gemini API credentials", {
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret,
    });

    if (!apiKey || !apiSecret) {
      logger.error("Gemini API credentials not configured");
      return NextResponse.json(
        { error: "Gemini API credentials not configured" },
        { status: 500 },
      );
    }

    logger.debug("Initializing Gemini handler");
    const handler = new GeminiHandler({
      apiKey,
      apiSecret,
    });

    logger.debug("Fetching Gemini balances");
    const balances = await handler.getBalances();
    logger.debug("Successfully fetched balances", { count: balances.length });

    logger.debug("Fetching total balance");
    const total = await handler.getTotalBalance();
    logger.debug("Successfully fetched total", { total });

    return NextResponse.json({ balances, total });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = {
      name: error instanceof Error ? error.name : "Unknown",
      stack: error instanceof Error ? error.stack : undefined,
      message: errorMessage,
    };

    logger.error("Failed to fetch Gemini balances:", errorDetails);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
