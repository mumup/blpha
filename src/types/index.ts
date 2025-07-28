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
  totalValue: number; // 以 USD 计算的总交易量（翻倍后的值）
  actualValue: number; // 实际交易量（未翻倍的值）
  score: number; // 计算出的积分
  nextLevelAmount: number; // 距离下一等级还需要的实际交易量
  trades: AlphaTradeDetail[]; // Alpha交易（计入分数）
  levelInfo: { currentLevel: number, nextLevel: number, progress: number }; // 等级进度信息
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
  allTrades: AlphaTradeDetail[]; // 移动所有交易详情到PNL模块
  trades: AlphaTradeDetail[]; // Alpha交易（计入分数）
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

// 活动相关类型
export interface Activity {
  name: string;
  symbol: string;
  type: string;
  startTime: string;
  endTime: string;
  isFCFS: boolean;
  points: string;
  pointsRequire: string;
  isStage2: boolean;
  amount: string;
  isFutures: boolean;
  futuresTime: string;
  chain: string;
  isSpot: boolean;
  isSecondStage?: boolean; // 标识是否为第二阶段（用于内部处理）
}

export interface ActivitiesResponse {
  success: boolean;
  data: Activity[];
  total: number;
  todayStart: string;
  currentTime: string;
  timestamp: string;
}

export interface TokenPriceResponse {
  success: boolean;
  data: { price: number; symbol: string }[];
  timestamp: string;
  total: number;
}