import crypto from "crypto";
import { logger } from "@/lib/utils/core/logger";
import { GeminiBalance, GeminiConfig } from "./types";

const REQUEST_TIMEOUT = 30000; // 30 seconds

interface GeminiAccount {
  account: string;
  name: string;
}

interface GeminiErrorResponse {
  message: string;
  reason?: string;
  result?: string;
}

export class GeminiHandler {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl: string;
  private readonly accountName: string;
  private accountId?: string;

  constructor(config: GeminiConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseUrl = "https://api.gemini.com/v1";
    this.accountName = config.accountName || "primary";
  }

  private generateHeaders(
    endpoint: string,
    payload: any = {},
  ): Record<string, string> {
    const nonce = Date.now();
    const fullPayload = {
      request: `/v1${endpoint}`,
      nonce,
      ...payload,
    };

    const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString(
      "base64",
    );
    const signature = crypto
      .createHmac("sha384", this.apiSecret)
      .update(encodedPayload)
      .digest("hex");

    return {
      "Content-Type": "text/plain",
      "Content-Length": "0",
      "X-GEMINI-APIKEY": this.apiKey,
      "X-GEMINI-PAYLOAD": encodedPayload,
      "X-GEMINI-SIGNATURE": signature,
      "Cache-Control": "no-cache",
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    payload: any = {},
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const headers = this.generateHeaders(endpoint, payload);
      logger.debug("Making Gemini API request", {
        endpoint,
        baseUrl: this.baseUrl,
        hasPayload: Object.keys(payload).length > 0,
        isMasterKey: this.apiKey.startsWith("master-"),
      });

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const data = (await response.json()) as T | GeminiErrorResponse;

      if (!response.ok) {
        const errorData = data as GeminiErrorResponse;
        const errorMessage =
          errorData.message || errorData.reason || response.statusText;
        logger.error(`Gemini API error (${response.status}): ${errorMessage}`);
        throw new Error(errorMessage);
      }

      logger.debug("Successful Gemini API response");
      return data as T;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timed out");
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Gemini API request failed: ${errorMessage}`);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async getAccountId(): Promise<string> {
    if (this.accountId) {
      return this.accountId;
    }

    if (!this.apiKey.startsWith("master-")) {
      return "primary";
    }

    try {
      const accounts = await this.makeRequest<GeminiAccount[]>("/account/list");
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const account =
        accounts.find((acc) => acc.name === this.accountName) || accounts[0];
      if (!account?.account) {
        throw new Error("Invalid account data received");
      }

      this.accountId = account.account;
      logger.debug("Found Gemini account", {
        accountId: this.accountId,
        accountName: account.name,
        totalAccounts: accounts.length,
      });

      return this.accountId;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to get account list";
      logger.error(`Failed to get account list: ${errorMessage}`);
      throw error;
    }
  }

  async getBalances(): Promise<GeminiBalance[]> {
    try {
      const accountId = await this.getAccountId();
      const payload = accountId !== "primary" ? { account: accountId } : {};
      const balances = await this.makeRequest<GeminiBalance[]>(
        "/balances",
        payload,
      );
      return balances.filter((balance) => parseFloat(balance.amount) > 0);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch Gemini balances";
      logger.error(`Failed to fetch Gemini balances: ${errorMessage}`);
      throw error;
    }
  }

  async getTotalBalance(): Promise<number> {
    try {
      const balances = await this.getBalances();
      let total = 0;

      for (const balance of balances) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        try {
          const tickerResponse = await fetch(
            `${this.baseUrl}/pubticker/${balance.currency}USD`,
            {
              signal: controller.signal,
            },
          );
          clearTimeout(timeout);

          if (tickerResponse.ok) {
            const ticker = await tickerResponse.json();
            const price = parseFloat(ticker.last);
            total += parseFloat(balance.amount) * price;
          }
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            logger.warn(`Timeout fetching price for ${balance.currency}`);
            continue;
          }
          throw error;
        } finally {
          clearTimeout(timeout);
        }
      }

      return total;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to calculate total Gemini balance";
      logger.error(`Failed to calculate total Gemini balance: ${errorMessage}`);
      throw error;
    }
  }
}
