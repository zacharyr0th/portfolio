export type CexPlatform = "Kraken" | "Coinbase" | "Gemini";
export type BrokerPlatform = "Fidelity" | "Schwab" | "Robinhood";
export type BankPlatform = "Chase" | "Wells Fargo" | "SoFi";
export type CreditPlatform = "Chase" | "Apple" | "SoFi";
export type DebitPlatform = "Chase" | "SoFi" | "Venmo";

export type CexAccountWithPlatform = Omit<CexAccount, "platform"> & {
  platform: CexPlatform;
};
