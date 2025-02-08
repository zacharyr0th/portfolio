import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/core/logger";
import { ADDRESS_REGEX, CHAIN_ADDRESS_TYPE } from "@/lib/chains/constants";

const SUI_RPC_URL =
  process.env.SUI_RPC_URL || "https://fullnode.mainnet.sui.io";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const chain = searchParams.get("chain")?.toLowerCase();
    const includeNfts = searchParams.get("include_nfts") === "true";

    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 },
      );
    }

    if (chain !== "sui") {
      return NextResponse.json(
        { error: "Invalid chain parameter" },
        { status: 400 },
      );
    }

    // Validate address format for Sui
    const addressRegex = ADDRESS_REGEX[CHAIN_ADDRESS_TYPE.sui];
    if (!address.match(addressRegex)) {
      return NextResponse.json(
        { error: "Invalid Sui address format" },
        { status: 400 },
      );
    }

    // Fetch all owned objects
    const response = await fetch(SUI_RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "suix_getOwnedObjects",
        params: [
          address,
          {
            options: {
              showType: true,
              showContent: true,
              showOwner: true,
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Sui RPC error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(
        `Sui RPC error: ${data.error.message || JSON.stringify(data.error)}`,
      );
    }

    const objects = data.result?.data || [];
    const balances = [];
    const nfts = [];

    // Process objects
    for (const obj of objects) {
      const type = obj.data?.type;
      const content = obj.data?.content;

      if (!type || !content) continue;

      // Handle SUI coin type
      if (type === "0x2::coin::Coin<0x2::sui::SUI>") {
        balances.push({
          token: {
            symbol: "SUI",
            name: "Sui",
            decimals: 9,
            address: "0x2::sui::SUI",
            chain: "sui",
            verified: true,
          },
          balance: content.balance || "0",
          uiAmount: Number(content.balance || "0") / Math.pow(10, 9),
        });
      }
      // Handle other coin types
      else if (type.startsWith("0x2::coin::Coin<")) {
        const tokenType = type.match(/0x2::coin::Coin<(.+)>/)?.[1];
        if (!tokenType) continue;

        balances.push({
          token: {
            symbol: tokenType.split("::").pop() || "UNKNOWN",
            name: tokenType.split("::").pop() || "Unknown Token",
            decimals: 9, // Most Sui tokens use 9 decimals
            address: tokenType,
            chain: "sui",
            verified: false,
          },
          balance: content.balance || "0",
          uiAmount: Number(content.balance || "0") / Math.pow(10, 9),
        });
      }
      // Handle NFTs if requested
      else if (includeNfts) {
        nfts.push({
          id: obj.data.objectId,
          type: type,
          content: content,
        });
      }
    }

    // Aggregate balances by token address
    const aggregatedBalances = Object.values(
      balances.reduce((acc: any, curr) => {
        const key = curr.token.address;
        if (!acc[key]) {
          acc[key] = curr;
        } else {
          acc[key].balance = (
            BigInt(acc[key].balance) + BigInt(curr.balance)
          ).toString();
          acc[key].uiAmount = acc[key].uiAmount + curr.uiAmount;
        }
        return acc;
      }, {}),
    );

    return NextResponse.json({
      balances: aggregatedBalances,
      nfts: includeNfts ? nfts : undefined,
    });
  } catch (error) {
    logger.error(
      "Error in Sui assets route:",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch Sui data",
      },
      { status: 500 },
    );
  }
}
