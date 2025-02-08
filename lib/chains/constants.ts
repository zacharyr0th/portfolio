export const SUPPORTED_CHAINS = {
  // Layer 1s
  ethereum: "ethereum",
  solana: "solana",
  bitcoin: "bitcoin",
  utxo: "utxo", // Bitcoin Rare Sats
  tezos: "tezos",
  aptos: "aptos",
  flow: "flow",
  flow_evm: "flow-evm",
  sei: "sei",
  sui: "sui",

  // EVM Layer 2s & Sidechains
  abstract: "abstract",
  apechain: "apechain",
  polygon: "polygon",
  arbitrum: "arbitrum",
  arbitrum_nova: "arbitrum-nova",
  avalanche: "avalanche",
  b3: "b3",
  base: "base",
  blast: "blast",
  bsc: "bsc",
  canto: "canto",
  celo: "celo",
  cyber: "cyber",
  degen: "degen",
  fantom: "fantom",
  forma: "forma",
  gnosis: "gnosis",
  godwoken: "godwoken",
  immutable_zkevm: "immutable-zkevm",
  linea: "linea",
  loot: "loot",
  manta: "manta",
  mantle: "mantle",
  mode: "mode",
  moonbeam: "moonbeam",
  opbnb: "opbnb",
  optimism: "optimism",
  palm: "palm",
  polygon_zkevm: "polygon-zkevm",
  proof_of_play: "proof-of-play",
  proof_of_play_boss: "proof-of-play-boss",
  rari: "rari",
  soneium: "soneium",
  saakuru: "saakuru",
  scroll: "scroll",
  shape: "shape",
  treasure: "treasure",
  xai: "xai",
  zksync_era: "zksync-era",
  zora: "zora",
} as const;

export type ChainType = keyof typeof SUPPORTED_CHAINS;

// Chains that support NFTs
export const NFT_SUPPORTED_CHAINS = {
  // Layer 1s
  ethereum: SUPPORTED_CHAINS.ethereum,
  solana: SUPPORTED_CHAINS.solana,
  bitcoin: SUPPORTED_CHAINS.bitcoin,
  utxo: SUPPORTED_CHAINS.utxo,
  tezos: SUPPORTED_CHAINS.tezos,
  aptos: SUPPORTED_CHAINS.aptos,
  flow: SUPPORTED_CHAINS.flow,
  flow_evm: SUPPORTED_CHAINS.flow_evm,
  sei: SUPPORTED_CHAINS.sei,
  sui: SUPPORTED_CHAINS.sui,

  // EVM Layer 2s & Sidechains
  polygon: SUPPORTED_CHAINS.polygon,
  arbitrum: SUPPORTED_CHAINS.arbitrum,
  arbitrum_nova: SUPPORTED_CHAINS.arbitrum_nova,
  avalanche: SUPPORTED_CHAINS.avalanche,
  base: SUPPORTED_CHAINS.base,
  blast: SUPPORTED_CHAINS.blast,
  bsc: SUPPORTED_CHAINS.bsc,
  canto: SUPPORTED_CHAINS.canto,
  celo: SUPPORTED_CHAINS.celo,
  fantom: SUPPORTED_CHAINS.fantom,
  gnosis: SUPPORTED_CHAINS.gnosis,
  immutable_zkevm: SUPPORTED_CHAINS.immutable_zkevm,
  linea: SUPPORTED_CHAINS.linea,
  manta: SUPPORTED_CHAINS.manta,
  mantle: SUPPORTED_CHAINS.mantle,
  mode: SUPPORTED_CHAINS.mode,
  moonbeam: SUPPORTED_CHAINS.moonbeam,
  opbnb: SUPPORTED_CHAINS.opbnb,
  optimism: SUPPORTED_CHAINS.optimism,
  palm: SUPPORTED_CHAINS.palm,
  polygon_zkevm: SUPPORTED_CHAINS.polygon_zkevm,
  scroll: SUPPORTED_CHAINS.scroll,
  zksync_era: SUPPORTED_CHAINS.zksync_era,
  zora: SUPPORTED_CHAINS.zora,
} as const;

// Chains that support fungible tokens
export const TOKEN_SUPPORTED_CHAINS = {
  // Layer 1s
  ethereum: SUPPORTED_CHAINS.ethereum,
  solana: SUPPORTED_CHAINS.solana,
  bitcoin: SUPPORTED_CHAINS.bitcoin,
  aptos: SUPPORTED_CHAINS.aptos,
  flow: SUPPORTED_CHAINS.flow,
  flow_evm: SUPPORTED_CHAINS.flow_evm,
  sei: SUPPORTED_CHAINS.sei,
  sui: SUPPORTED_CHAINS.sui,
  tezos: SUPPORTED_CHAINS.tezos,

  // EVM Layer 2s & Sidechains
  abstract: SUPPORTED_CHAINS.abstract,
  apechain: SUPPORTED_CHAINS.apechain,
  arbitrum: SUPPORTED_CHAINS.arbitrum,
  arbitrum_nova: SUPPORTED_CHAINS.arbitrum_nova,
  avalanche: SUPPORTED_CHAINS.avalanche,
  b3: SUPPORTED_CHAINS.b3,
  base: SUPPORTED_CHAINS.base,
  blast: SUPPORTED_CHAINS.blast,
  bsc: SUPPORTED_CHAINS.bsc,
  canto: SUPPORTED_CHAINS.canto,
  celo: SUPPORTED_CHAINS.celo,
  cyber: SUPPORTED_CHAINS.cyber,
  fantom: SUPPORTED_CHAINS.fantom,
  forma: SUPPORTED_CHAINS.forma,
  gnosis: SUPPORTED_CHAINS.gnosis,
  mantle: SUPPORTED_CHAINS.mantle,
  moonbeam: SUPPORTED_CHAINS.moonbeam,
  optimism: SUPPORTED_CHAINS.optimism,
  palm: SUPPORTED_CHAINS.palm,
  polygon: SUPPORTED_CHAINS.polygon,
  polygon_zkevm: SUPPORTED_CHAINS.polygon_zkevm,
  proof_of_play_boss: SUPPORTED_CHAINS.proof_of_play_boss,
  rari: SUPPORTED_CHAINS.rari,
  soneium: SUPPORTED_CHAINS.soneium,
  saakuru: SUPPORTED_CHAINS.saakuru,
  scroll: SUPPORTED_CHAINS.scroll,
  shape: SUPPORTED_CHAINS.shape,
  zora: SUPPORTED_CHAINS.zora,
} as const;

// Address format validation
export const ADDRESS_REGEX = {
  evm: /^0x[a-fA-F0-9]{40}$/,
  solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  bitcoin: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/,
  aptos: /^0x[a-fA-F0-9]{64}$/,
  utxo: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/,
  sui: /^0x[a-fA-F0-9]{64}$/,
  tezos: /^(tz1|tz2|tz3|KT1)[1-9A-HJ-NP-Za-km-z]{33}$/,
  flow: /^0x[a-fA-F0-9]{16}$/,
  sei: /^sei[a-zA-Z0-9]{39}$/,
} as const;

// Chain to address format mapping
export const CHAIN_ADDRESS_TYPE: Record<ChainType, keyof typeof ADDRESS_REGEX> =
  {
    ethereum: "evm",
    solana: "solana",
    bitcoin: "bitcoin",
    utxo: "utxo",
    polygon: "evm",
    arbitrum: "evm",
    arbitrum_nova: "evm",
    avalanche: "evm",
    base: "evm",
    blast: "evm",
    bsc: "evm",
    canto: "evm",
    celo: "evm",
    fantom: "evm",
    gnosis: "evm",
    linea: "evm",
    manta: "evm",
    mantle: "evm",
    mode: "evm",
    moonbeam: "evm",
    opbnb: "evm",
    optimism: "evm",
    polygon_zkevm: "evm",
    scroll: "evm",
    sei: "sei",
    zksync_era: "evm",
    zora: "evm",
    tezos: "tezos",
    aptos: "aptos",
    flow: "evm",
    flow_evm: "evm",
    abstract: "evm",
    apechain: "evm",
    b3: "evm",
    cyber: "evm",
    degen: "evm",
    forma: "evm",
    godwoken: "evm",
    immutable_zkevm: "evm",
    loot: "evm",
    proof_of_play: "evm",
    proof_of_play_boss: "evm",
    rari: "evm",
    soneium: "evm",
    saakuru: "evm",
    shape: "evm",
    treasure: "evm",
    xai: "evm",
    palm: "evm",
    sui: "sui",
  };

// Chain configurations with explorer URLs and native currency details
export const CHAIN_CONFIG = {
  ethereum: {
    name: "Ethereum",
    explorerUrl: "https://etherscan.io",
    nativeCurrency: { symbol: "ETH", name: "Ethereum", decimals: 18 },
    chainId: 1,
  },
  polygon: {
    name: "Polygon",
    explorerUrl: "https://polygonscan.com",
    nativeCurrency: { symbol: "MATIC", name: "Polygon", decimals: 18 },
    chainId: 137,
  },
  arbitrum: {
    name: "Arbitrum One",
    explorerUrl: "https://arbiscan.io",
    nativeCurrency: { symbol: "ETH", name: "Ethereum", decimals: 18 },
    chainId: 42161,
  },
  arbitrum_nova: {
    name: "Arbitrum Nova",
    explorerUrl: "https://nova.arbiscan.io",
    nativeCurrency: { symbol: "ETH", name: "Ethereum", decimals: 18 },
    chainId: 42170,
  },
  avalanche: {
    name: "Avalanche",
    explorerUrl: "https://snowtrace.io",
    nativeCurrency: { symbol: "AVAX", name: "Avalanche", decimals: 18 },
    chainId: 43114,
  },
  base: {
    name: "Base",
    explorerUrl: "https://basescan.org",
    nativeCurrency: { symbol: "ETH", name: "Ethereum", decimals: 18 },
    chainId: 8453,
  },
  blast: {
    name: "Blast",
    explorerUrl: "https://blastscan.io",
    nativeCurrency: { symbol: "ETH", name: "Ethereum", decimals: 18 },
    chainId: 81457,
  },
  bsc: {
    name: "BNB Chain",
    explorerUrl: "https://bscscan.com",
    nativeCurrency: { symbol: "BNB", name: "BNB", decimals: 18 },
    chainId: 56,
  },
  canto: {
    name: "Canto",
    explorerUrl: "https://cantoscan.com",
    nativeCurrency: { symbol: "CANTO", name: "Canto", decimals: 18 },
    chainId: 7700,
  },
  celo: {
    name: "Celo",
    explorerUrl: "https://celoscan.io",
    nativeCurrency: { symbol: "CELO", name: "Celo", decimals: 18 },
    chainId: 42220,
  },
  fantom: {
    name: "Fantom",
    explorerUrl: "https://ftmscan.com",
    nativeCurrency: { symbol: "FTM", name: "Fantom", decimals: 18 },
    chainId: 250,
  },
  gnosis: {
    name: "Gnosis",
    explorerUrl: "https://gnosisscan.io",
    nativeCurrency: { symbol: "xDAI", name: "xDAI", decimals: 18 },
    chainId: 100,
  },
  linea: {
    name: "Linea",
    explorerUrl: "https://lineascan.build",
    nativeCurrency: { symbol: "ETH", name: "Ethereum", decimals: 18 },
    chainId: 59144,
  },
  manta: {
    name: "Manta",
    explorerUrl: "https://pacific-explorer.manta.network",
    nativeCurrency: { symbol: "ETH", name: "Ethereum", decimals: 18 },
    chainId: 169,
  },
  mantle: {
    name: "Mantle",
    explorerUrl: "https://explorer.mantle.xyz",
    nativeCurrency: { symbol: "MNT", name: "Mantle", decimals: 18 },
    chainId: 5000,
  },
  mode: {
    name: "Mode",
    explorerUrl: "https://explorer.mode.network",
    nativeCurrency: { symbol: "ETH", name: "Ethereum", decimals: 18 },
    chainId: 34443,
  },
  moonbeam: {
    name: "Moonbeam",
    explorerUrl: "https://moonscan.io",
    nativeCurrency: { symbol: "GLMR", name: "Glimmer", decimals: 18 },
    chainId: 1284,
  },
  opbnb: {
    name: "opBNB",
    explorerUrl: "https://opbnbscan.com",
    nativeCurrency: { symbol: "BNB", name: "BNB", decimals: 18 },
    chainId: 204,
  },
  optimism: {
    name: "Optimism",
    explorerUrl: "https://optimistic.etherscan.io",
    nativeCurrency: { symbol: "ETH", name: "Ethereum", decimals: 18 },
    chainId: 10,
  },
  polygon_zkevm: {
    name: "Polygon zkEVM",
    explorerUrl: "https://zkevm.polygonscan.com",
    nativeCurrency: { symbol: "ETH", name: "Ethereum", decimals: 18 },
    chainId: 1101,
  },
  scroll: {
    name: "Scroll",
    explorerUrl: "https://scrollscan.com",
    nativeCurrency: { symbol: "ETH", name: "Ethereum", decimals: 18 },
    chainId: 534352,
  },
  sei: {
    name: "Sei",
    explorerUrl: "https://www.seiscan.app",
    nativeCurrency: { symbol: "SEI", name: "Sei", decimals: 6 },
    chainId: 713715,
  },
  zksync_era: {
    name: "zkSync Era",
    explorerUrl: "https://explorer.zksync.io",
    nativeCurrency: { symbol: "ETH", name: "Ethereum", decimals: 18 },
    chainId: 324,
  },
  zora: {
    name: "Zora",
    explorerUrl: "https://explorer.zora.energy",
    nativeCurrency: { symbol: "ETH", name: "Ethereum", decimals: 18 },
    chainId: 7777777,
  },
  abstract: {
    name: "Abstract",
    explorerUrl: "https://explorer.abstract.money",
    nativeCurrency: { symbol: "ABS", name: "Abstract", decimals: 18 },
    chainId: 2741,
  },
  apechain: {
    name: "Apechain",
    explorerUrl: "https://explorer.apechain.com",
    nativeCurrency: { symbol: "APE", name: "ApeCoin", decimals: 18 },
    chainId: 33139,
  },
  b3: {
    name: "B3",
    explorerUrl: "https://explorer.b3network.com",
    nativeCurrency: { symbol: "B3", name: "B3", decimals: 18 },
    chainId: 8333,
  },
  cyber: {
    name: "Cyber",
    explorerUrl: "https://explorer.cyber.co",
    nativeCurrency: { symbol: "CYBER", name: "Cyber", decimals: 18 },
    chainId: 7560,
  },
  degen: {
    name: "Degen",
    explorerUrl: "https://explorer.degen.network",
    nativeCurrency: { symbol: "DEGEN", name: "Degen", decimals: 18 },
    chainId: 666666666,
  },
  forma: {
    name: "Forma",
    explorerUrl: "https://explorer.forma.xyz",
    nativeCurrency: { symbol: "FORMA", name: "Forma", decimals: 18 },
    chainId: 984122,
  },
  godwoken: {
    name: "Godwoken",
    explorerUrl: "https://explorer.godwoken.io",
    nativeCurrency: { symbol: "ETH", name: "Ethereum", decimals: 18 },
    chainId: 71402,
  },
  immutable_zkevm: {
    name: "Immutable zkEVM",
    explorerUrl: "https://explorer.immutable.io",
    nativeCurrency: { symbol: "ETH", name: "Ethereum", decimals: 18 },
    chainId: 13371,
  },
  loot: {
    name: "Loot",
    explorerUrl: "https://explorer.loot.sh",
    nativeCurrency: { symbol: "LOOT", name: "Loot", decimals: 18 },
    chainId: 5151706,
  },
  proof_of_play: {
    name: "Proof of Play",
    explorerUrl: "https://explorer.proofofplay.io",
    nativeCurrency: { symbol: "PLAY", name: "Proof of Play", decimals: 18 },
    chainId: 70700,
  },
  proof_of_play_boss: {
    name: "Proof of Play Boss",
    explorerUrl: "https://explorer.proofofplay.io",
    nativeCurrency: {
      symbol: "BOSS",
      name: "Proof of Play Boss",
      decimals: 18,
    },
    chainId: 70701,
  },
  rari: {
    name: "Rari",
    explorerUrl: "https://explorer.rari.capital",
    nativeCurrency: { symbol: "RARI", name: "Rari", decimals: 18 },
    chainId: 1380012617,
  },
  soneium: {
    name: "Soneium",
    explorerUrl: "https://explorer.soneium.io",
    nativeCurrency: { symbol: "SONE", name: "Soneium", decimals: 18 },
    chainId: 1868,
  },
  saakuru: {
    name: "Saakuru",
    explorerUrl: "https://explorer.saakuru.io",
    nativeCurrency: { symbol: "SAK", name: "Saakuru", decimals: 18 },
    chainId: 7225878,
  },
  palm: {
    name: "Palm",
    explorerUrl: "https://explorer.palm.io",
    nativeCurrency: { symbol: "PALM", name: "Palm", decimals: 18 },
    chainId: 11297108109,
  },
  shape: {
    name: "Shape",
    explorerUrl: "https://explorer.shape.space",
    nativeCurrency: { symbol: "SHAPE", name: "Shape", decimals: 18 },
    chainId: 360,
  },
  treasure: {
    name: "Treasure",
    explorerUrl: "https://explorer.treasure.io",
    nativeCurrency: { symbol: "TREASURE", name: "Treasure", decimals: 18 },
    chainId: 61166,
  },
  xai: {
    name: "XAI",
    explorerUrl: "https://explorer.xai.network",
    nativeCurrency: { symbol: "XAI", name: "XAI", decimals: 18 },
    chainId: 660279,
  },
  flow: {
    name: "Flow",
    explorerUrl: "https://flowdiver.io",
    nativeCurrency: { symbol: "FLOW", name: "Flow", decimals: 8 },
    chainId: 1,
  },
  flow_evm: {
    name: "Flow EVM",
    explorerUrl: "https://flowdiver.io/evm",
    nativeCurrency: { symbol: "FLOW", name: "Flow", decimals: 18 },
    chainId: 747,
  },
} as const;

// Helper function to get chain info
export function getChainInfo(chain: ChainType) {
  return CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG] || null;
}

// Helper function to get chain name
export function getChainName(chain: ChainType) {
  return CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG]?.name || chain;
}

// Helper function to get explorer URL
export function getExplorerUrl(chain: ChainType) {
  return CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG]?.explorerUrl || null;
}

// Helper function to get native currency info
export function getNativeCurrency(chain: ChainType) {
  return (
    CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG]?.nativeCurrency || null
  );
}

// Helper function to get chain ID
export function getChainId(chain: ChainType) {
  return CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG]?.chainId || null;
}

// Helper function to validate address format
export function isValidAddress(chain: ChainType, address: string): boolean {
  const addressType = CHAIN_ADDRESS_TYPE[chain];
  if (!addressType) return false;
  const regex = ADDRESS_REGEX[addressType];
  return regex.test(address);
}

// Helper function to check if chain is EVM-based
export function isEvmChain(chain: ChainType): boolean {
  return CHAIN_ADDRESS_TYPE[chain] === "evm";
}

// Helper function to check if chain supports NFTs
export function supportsNfts(chain: ChainType): boolean {
  return chain in NFT_SUPPORTED_CHAINS;
}

// Helper function to check if chain supports tokens
export function supportsTokens(chain: ChainType): boolean {
  return chain in TOKEN_SUPPORTED_CHAINS;
}

// Cross-chain IDs for chains
export const CHAIN_CROSS_IDS = {
  ethereum: "eip155:1",
  solana: "solana:101",
  polygon: "eip155:137",
  abstract: "eip155:2741",
  arbitrum: "eip155:42161",
  arbitrum_nova: "eip155:42170",
  avalanche: "eip155:43114",
  apechain: "eip155:33139",
  b3: "eip155:8333",
  base: "eip155:8453",
  blast: "eip155:81457",
  bsc: "eip155:56",
  canto: "eip155:7700",
  celo: "eip155:42220",
  cyber: "eip155:7560",
  degen: "eip155:666666666",
  fantom: "eip155:250",
  forma: "eip155:984122",
  flow_evm: "eip155:747",
  gnosis: "eip155:100",
  godwoken: "eip155:71402",
  immutable_zkevm: "eip155:13371",
  linea: "eip155:59144",
  loot: "eip155:5151706",
  manta: "eip155:169",
  mantle: "eip155:5000",
  mode: "eip155:34443",
  moonbeam: "eip155:1284",
  opbnb: "eip155:204",
  optimism: "eip155:10",
  palm: "eip155:11297108109",
  polygon_zkevm: "eip155:1442",
  proof_of_play: "eip155:70700",
  proof_of_play_boss: "eip155:70701",
  rari: "eip155:1380012617",
  soneium: "eip155:1868",
  saakuru: "eip155:7225878",
  scroll: "eip155:534352",
  sei: "eip155:1329",
  shape: "eip155:360",
  treasure: "eip155:61166",
  xai: "eip155:660279",
  zksync_era: "eip155:324",
  zora: "eip155:7777777",
} as const;
