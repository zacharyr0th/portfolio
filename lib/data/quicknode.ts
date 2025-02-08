import axios from "axios";

// QuickNode API endpoints
const QUICKNODE_BASE_URL = "https://api.quicknode.com";

// QuickNode API endpoints for different services
const ENDPOINTS = {
  FUNCTIONS: `${QUICKNODE_BASE_URL}/rest/functions`,
  IPFS: `${QUICKNODE_BASE_URL}/rest/ipfs`,
  KV: `${QUICKNODE_BASE_URL}/rest/kv`,
  QUICKALERTS: `${QUICKNODE_BASE_URL}/rest/quickalerts`,
  STREAMS: `${QUICKNODE_BASE_URL}/rest/streams`,
} as const;

// Types for QuickNode responses
interface QuickNodeResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// QuickNode client class
export class QuickNodeClient {
  private readonly apiKey: string;
  private readonly headers: Record<string, string>;

  constructor() {
    const apiKey = process.env.QUICKNODE_API_KEY;
    if (!apiKey) {
      throw new Error("QUICKNODE_API_KEY environment variable is not set");
    }
    this.apiKey = apiKey;
    this.headers = {
      "Content-Type": "application/json",
      "x-api-key": this.apiKey,
    };
  }

  // Generic request method
  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    data?: unknown,
  ): Promise<T> {
    try {
      const response = await axios({
        method,
        url: endpoint,
        headers: this.headers,
        data,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `QuickNode API error: ${error.response?.data?.error || error.message}`,
        );
      }
      throw error;
    }
  }

  // Functions REST API methods
  async callFunction(functionId: string, params: Record<string, unknown>) {
    return this.request<QuickNodeResponse<unknown>>(
      `${ENDPOINTS.FUNCTIONS}/${functionId}`,
      "POST",
      params,
    );
  }

  // IPFS REST API methods
  async uploadToIPFS(file: Buffer | string) {
    const formData = new FormData();
    if (Buffer.isBuffer(file)) {
      const uint8Array = new Uint8Array(file);
      const blob = new Blob([uint8Array], { type: "application/octet-stream" });
      formData.append("file", blob);
    } else {
      formData.append("file", file);
    }
    return this.request<QuickNodeResponse<{ cid: string }>>(
      ENDPOINTS.IPFS,
      "POST",
      formData,
    );
  }

  async getFromIPFS(cid: string) {
    return this.request<QuickNodeResponse<{ data: string }>>(
      `${ENDPOINTS.IPFS}/${cid}`,
    );
  }

  // Key-Value Store methods
  async kvSet(key: string, value: unknown) {
    return this.request<QuickNodeResponse<null>>(ENDPOINTS.KV, "POST", {
      key,
      value,
    });
  }

  async kvGet(key: string) {
    return this.request<QuickNodeResponse<unknown>>(`${ENDPOINTS.KV}/${key}`);
  }

  // QuickAlerts methods
  async createAlert(params: Record<string, unknown>) {
    return this.request<QuickNodeResponse<{ id: string }>>(
      ENDPOINTS.QUICKALERTS,
      "POST",
      params,
    );
  }

  // Streams methods
  async createStream(params: Record<string, unknown>) {
    return this.request<QuickNodeResponse<{ id: string }>>(
      ENDPOINTS.STREAMS,
      "POST",
      params,
    );
  }
}

// Export singleton instance
export const quicknode = new QuickNodeClient();
