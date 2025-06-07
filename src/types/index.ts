// BSCScan API 相关类型
export interface BSCScanResponse<T> {
  status: string;
  message: string;
  result: T;
}

export interface BlockResponse {
  result: string;
}

export interface Transaction {
  blockNumber: string;
  blockHash: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  transactionIndex: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  input: string;
  methodId: string;
  functionName: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  txreceipt_status: string;
  gasUsed: string;
  confirmations: string;
  isError: string;
}

export interface TokenTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  methodId: string;
  functionName: string;
  confirmations: string;
}

// Alpha 代币类型
export interface AlphaToken {
  tokenId: string;
  chainId: string;
  chainIconUrl: string;
  chainName: string;
  contractAddress: string;
  name: string;
  symbol: string;
  iconUrl: string;
  price: string;
  percentChange24h: string;
  volume24h: string;
  marketCap: string;
  fdv: string;
  liquidity: string;
  totalSupply: string;
  circulatingSupply: string;
  holders: string;
  decimals: number;
  listingCex: boolean;
  hotTag: boolean;
  cexCoinName: string;
  canTransfer: boolean;
  denomination: number;
  offline: boolean;
  tradeDecimal: number;
  alphaId: string;
  offsell: boolean;
  priceHigh24h: string;
  priceLow24h: string;
  onlineTge: boolean;
  onlineAirdrop: boolean;
}

// 应用状态类型
export interface AddressHistory {
  address: string;
  timestamp: number;
}

export interface Settings {
  apiKey: string;
}

// 交易分析结果类型
export interface AlphaTradeResult {
  totalValue: number; // 以 USD 计算的总交易量
  score: number; // 计算出的积分
  nextLevelAmount: number; // 距离下一等级还需要的交易量
  trades: AlphaTradeDetail[]; // Alpha交易（计入分数）
  allTrades: AlphaTradeDetail[]; // 所有交易（包括非Alpha）
}

export interface AlphaTradeDetail {
  hash: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  fromTokenSymbol: string;
  toTokenSymbol: string;
  usdValue: number;
  timestamp: string;
}

export interface PNLResult {
  totalPNL: number;
  totalGasCost: number;
  tokenBalances: TokenBalance[];
}

export interface TokenBalance {
  contractAddress: string;
  symbol: string;
  name: string;
  totalIn: string;
  totalOut: string;
  netAmount: string;
  currentPrice: number;
  pnl: number;
}

// 稳定币和主要代币地址
export const STABLE_TOKENS = {
  USDT: '0x55d398326f99059ff775485246999027b3197955',
  USDC: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
  WBNB: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'
} as const;

export const SCORE_LEVELS = [
  { amount: 2, score: 1 },
  { amount: 4, score: 2 },
  { amount: 8, score: 3 },
  { amount: 16, score: 4 },
  { amount: 32, score: 5 },
] as const; 