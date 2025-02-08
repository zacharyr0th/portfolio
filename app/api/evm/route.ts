import { NextResponse } from "next/server";
import { evmHandlerInstance } from "@/lib/chains/evm+/handler";
import { isAddress } from "ethers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { address } = body;

    if (!address || !isAddress(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const balances = await evmHandlerInstance.fetchBalances(address);
    const tokens = balances.filter((b) => parseFloat(b.balance) > 0);
    const prices = await evmHandlerInstance.fetchPrices(tokens);

    return NextResponse.json({
      balances: tokens.map((token) => ({
        ...token,
        price: prices[token.token.symbol],
      })),
    });
  } catch (error) {
    console.error("Error in EVM API route:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      {
        status:
          error instanceof Error && error.message.includes("Invalid address")
            ? 400
            : 500,
      },
    );
  }
}
