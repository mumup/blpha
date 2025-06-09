import type { Transaction, TokenTransaction, AlphaToken, AlphaTradeResult, AlphaTradeDetail, PNLResult, TokenBalance } from '../types';
import { STABLE_TOKENS, SCORE_LEVELS } from '../types';
import { MarketWebbService } from './cexapi';
import alphaTokens from '../assets/coins/56';

// Binance DEX Router地址 - 只计算与此地址交互的交易
const BINANCE_DEX_ROUTER = '0xb300000b72DEAEb607a12d5f54773D1C19c7028d'.toLowerCase();

interface TradeInfo {
  hash: string;
  fromTx: TokenTransaction;
  toTx: TokenTransaction;
  usdValue: number;
  isAlphaTrade: boolean;
}

export class TransactionAnalyzer {
  private alphaTokens: AlphaToken[];
  private alphaTokenMap: Map<string, AlphaToken>;
  private realTimePrices: Map<string, number> = new Map();
  private bnbPrice: number = 600;

  constructor() {
    this.alphaTokens = alphaTokens as AlphaToken[];
    this.alphaTokenMap = new Map();
    
    // 创建地址到代币的映射
    this.alphaTokens.forEach(token => {
      this.alphaTokenMap.set(token.contractAddress.toLowerCase(), token);
    });
  }

  // 获取实时价格
  async updateRealTimePrices(contractAddresses: string[]): Promise<void> {
    try {
      // 获取主要币种价格
      const mainPrices = await MarketWebbService.getMainCoinPrices();
      this.bnbPrice = mainPrices.bnb;

      // 过滤掉稳定币和WBNB，只查询需要的代币价格
      const uniqueAddresses = [...new Set(contractAddresses.map(addr => addr.toLowerCase()))]
        .filter(addr => {
          if (this.isStableCoin(addr)) return false;
          if (addr === STABLE_TOKENS.WBNB.toLowerCase()) return false;
          return true;
        });

      console.log(`Fetching prices for ${uniqueAddresses.length} tokens (excluded stablecoins and WBNB)`);

      if (uniqueAddresses.length > 0) {
        const prices = await MarketWebbService.getTokenPrices(uniqueAddresses);
        this.realTimePrices = prices;
        console.log(`Successfully fetched ${prices.size} token prices`);
      }
    } catch (error) {
      console.error('Error updating real-time prices:', error);
    }
  }

  // 获取代币当前价格（优先使用实时价格）
  getTokenPrice(contractAddress: string): number {
    const normalizedAddress = contractAddress.toLowerCase();
    
    const realTimePrice = this.realTimePrices.get(normalizedAddress);
    if (realTimePrice !== undefined) {
      return realTimePrice;
    }

    if (this.isStableCoin(contractAddress)) {
      return 1.0;
    }

    if (normalizedAddress === STABLE_TOKENS.WBNB.toLowerCase()) {
      return this.bnbPrice;
    }

    const tokenInfo = this.getTokenInfo(contractAddress);
    if (tokenInfo) {
      return parseFloat(tokenInfo.price);
    }

    return 0;
  }

  // 检查是否为Alpha代币
  isAlphaToken(contractAddress: string): boolean {
    return this.alphaTokenMap.has(contractAddress.toLowerCase());
  }

  // 检查是否为稳定币
  isStableCoin(contractAddress: string): boolean {
    const addr = contractAddress.toLowerCase();
    return Object.values(STABLE_TOKENS).some(stableAddr => stableAddr.toLowerCase() === addr);
  }

  // 获取代币信息
  getTokenInfo(contractAddress: string): AlphaToken | undefined {
    return this.alphaTokenMap.get(contractAddress.toLowerCase());
  }

  // 解析所有交易，提取交易信息（核心共用方法）
  private parseAllTrades(transactions: Transaction[], tokenTransactions: TokenTransaction[]): TradeInfo[] {
    const trades: TradeInfo[] = [];
    
    // 创建交易哈希到主交易的映射
    const transactionMap = new Map<string, Transaction>();
    transactions.forEach(tx => {
      transactionMap.set(tx.hash, tx);
    });

    // 过滤只与DEX Router交互的代币交易
    const dexTokenTransactions = tokenTransactions.filter(tokenTx => {
      const mainTx = transactions.find(tx => tx.hash === tokenTx.hash);
      if (!mainTx) return false;
      return mainTx.to.toLowerCase() === BINANCE_DEX_ROUTER || 
             mainTx.from.toLowerCase() === BINANCE_DEX_ROUTER;
    });

    console.log(`🔍 过滤DEX交易: ${dexTokenTransactions.length}/${tokenTransactions.length} 个代币交易与DEX Router交互`);

    // 按哈希分组代币转账
    const tokenTxByHash = new Map<string, TokenTransaction[]>();
    dexTokenTransactions.forEach(tokenTx => {
      const hash = tokenTx.hash;
      if (!tokenTxByHash.has(hash)) {
        tokenTxByHash.set(hash, []);
      }
      tokenTxByHash.get(hash)!.push(tokenTx);
    });

    // 分析每个交易
    tokenTxByHash.forEach((tokenTxs, hash) => {
      const mainTx = transactionMap.get(hash);
      if (!mainTx || tokenTxs.length < 2) return;

      const userAddress = mainTx.from.toLowerCase();
      const fromTxs = tokenTxs.filter(tx => tx.from.toLowerCase() === userAddress);
      const toTxs = tokenTxs.filter(tx => tx.to.toLowerCase() === userAddress);

      if (fromTxs.length === 0 || toTxs.length === 0) return;

      // 选择主要的流出和流入交易（价值最大的）
      const fromTx = this.selectMaxValueTx(fromTxs);
      const toTx = this.selectMaxValueTx(toTxs);

      // 计算USD价值
      const usdValue = this.calculateUSDValue(fromTx);
      if (usdValue <= 0) return;

      // 检查是否为Alpha交易
      const isAlphaTrade = this.isValidAlphaTrade(fromTx, toTx);

      trades.push({
        hash,
        fromTx,
        toTx,
        usdValue,
        isAlphaTrade
      });
    });

    return trades;
  }

  // 选择价值最大的交易
  private selectMaxValueTx(txs: TokenTransaction[]): TokenTransaction {
    return txs.reduce((max, tx) => {
      const maxValue = parseFloat(max.value) / Math.pow(10, parseInt(max.tokenDecimal));
      const txValue = parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal));
      return txValue > maxValue ? tx : max;
    });
  }

  // 计算USD价值
  private calculateUSDValue(fromTx: TokenTransaction): number {
    const fromIsStable = this.isStableCoin(fromTx.contractAddress);
    
    if (fromIsStable) {
      return parseFloat(fromTx.value) / Math.pow(10, parseInt(fromTx.tokenDecimal));
    } else if (fromTx.contractAddress.toLowerCase() === STABLE_TOKENS.WBNB.toLowerCase()) {
      const bnbAmount = parseFloat(fromTx.value) / Math.pow(10, parseInt(fromTx.tokenDecimal));
      return bnbAmount * this.bnbPrice;
    } else {
      const fromAmount = parseFloat(fromTx.value) / Math.pow(10, parseInt(fromTx.tokenDecimal));
      const fromTokenPrice = this.getTokenPrice(fromTx.contractAddress);
      return fromAmount * fromTokenPrice;
    }
  }

  // 检查是否为有效的Alpha交易
  private isValidAlphaTrade(fromTx: TokenTransaction, toTx: TokenTransaction): boolean {
    const fromIsAlpha = this.isAlphaToken(fromTx.contractAddress);
    const toIsAlpha = this.isAlphaToken(toTx.contractAddress);
    const fromIsStable = this.isStableCoin(fromTx.contractAddress);
    
    return (fromIsStable && toIsAlpha) || 
           (fromTx.contractAddress.toLowerCase() === STABLE_TOKENS.WBNB.toLowerCase() && toIsAlpha) || 
           (fromIsAlpha && toIsAlpha);
  }

  // 将TradeInfo转换为AlphaTradeDetail
  private toTradeDetail(trade: TradeInfo): AlphaTradeDetail {
    return {
      hash: trade.hash,
      fromToken: trade.fromTx.contractAddress,
      toToken: trade.toTx.contractAddress,
      fromAmount: trade.fromTx.value,
      toAmount: trade.toTx.value,
      fromTokenSymbol: trade.fromTx.tokenSymbol,
      toTokenSymbol: trade.toTx.tokenSymbol,
      usdValue: trade.usdValue,
      timestamp: trade.fromTx.timeStamp,
    };
  }

  // 计算等级信息（统一的等级计算方法）
  private calculateLevelInfo(totalValue: number): { 
    currentLevel: number; 
    nextLevel: number; 
    progress: number; 
    score: number; 
    nextLevelAmount: number; 
  } {
    let currentLevel = 0;
    let nextLevel = 0;
    let score = 0;

    // 计算当前等级和分数
    for (const level of SCORE_LEVELS) {
      if (totalValue >= level.amount) {
        currentLevel = level.amount;
        score = level.score;
      } else {
        nextLevel = level.amount;
        break;
      }
    }

    debugger

    // 处理超过最高等级的情况
    if (nextLevel === 0) {
      const lastLevel = SCORE_LEVELS[SCORE_LEVELS.length - 1];
      nextLevel = lastLevel.amount * 2;
      // let currentAmount = lastLevel.amount;
      let currentScore = lastLevel.score;
      
      while (totalValue >= nextLevel) {
        currentLevel = nextLevel;
        nextLevel *= 2;
        currentScore += 1;
      }
      
      // 继续计算超出部分的分数
      // while (totalValue >= currentAmount * 2) {
      //   currentAmount *= 2;
      //   currentScore += 1;
      // }
      
      score = currentScore;
    }

    // 计算进度百分比
    let progress = 0;
    if (nextLevel > currentLevel) {
      progress = ((totalValue - currentLevel) / (nextLevel - currentLevel)) * 100;
    }

    // 计算还需要的交易量（考虑翻倍效应）
    const nextLevelAmount = (nextLevel - totalValue) / 2;

    return {
      currentLevel,
      nextLevel,
      progress: Math.max(0, Math.min(100, progress)),
      score,
      nextLevelAmount
    };
  }

  // 计算Alpha交易分数
  analyzeAlphaTrades(transactions: Transaction[], tokenTransactions: TokenTransaction[]): AlphaTradeResult {
    const allTrades = this.parseAllTrades(transactions, tokenTransactions);
    const alphaTrades = allTrades.filter(trade => trade.isAlphaTrade);
    
    // 计算交易量
    let actualValue = 0;
    let totalValue = 0;
    
    alphaTrades.forEach(trade => {
      actualValue += trade.usdValue;
      totalValue += trade.usdValue * 2; // Alpha分数翻倍
    });

    // 计算等级信息
    const levelInfo = this.calculateLevelInfo(totalValue);

    return {
      totalValue,
      actualValue,
      score: levelInfo.score,
      nextLevelAmount: levelInfo.nextLevelAmount,
      trades: alphaTrades.map(trade => this.toTradeDetail(trade))
        .sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp)),
      levelInfo: {
        currentLevel: levelInfo.currentLevel,
        nextLevel: levelInfo.nextLevel,
        progress: levelInfo.progress
      }
    };
  }

  // 计算PNL
  analyzePNL(transactions: Transaction[], tokenTransactions: TokenTransaction[], alphaTradesData?: AlphaTradeDetail[]): PNLResult {
    const allTrades = this.parseAllTrades(transactions, tokenTransactions);
    const tokenBalances = new Map<string, TokenBalance>();
    
    // 计算Gas费用
    const totalGasCost = transactions.reduce((total, tx) => {
      const gasUsed = parseInt(tx.gasUsed);
      const gasPrice = parseInt(tx.gasPrice);
      const gasCostWei = gasUsed * gasPrice;
      const gasCostBNB = gasCostWei / Math.pow(10, 18);
      return total + (gasCostBNB * this.bnbPrice);
    }, 0);

    // 获取用户地址
    const primaryUserAddress = transactions[0]?.from.toLowerCase() || '';
    
    // 过滤DEX交易的代币转账
    const dexTokenTransactions = tokenTransactions.filter(tokenTx => {
      const mainTx = transactions.find(tx => tx.hash === tokenTx.hash);
      if (!mainTx) return false;
      return mainTx.to.toLowerCase() === BINANCE_DEX_ROUTER || 
             mainTx.from.toLowerCase() === BINANCE_DEX_ROUTER;
    });

    // 计算代币余额
    dexTokenTransactions.forEach(tokenTx => {
      const contractAddress = tokenTx.contractAddress.toLowerCase();
      const amount = parseFloat(tokenTx.value) / Math.pow(10, parseInt(tokenTx.tokenDecimal));

      if (!tokenBalances.has(contractAddress)) {
        tokenBalances.set(contractAddress, {
          contractAddress: tokenTx.contractAddress,
          symbol: tokenTx.tokenSymbol,
          name: tokenTx.tokenName,
          totalIn: '0',
          totalOut: '0',
          netAmount: '0',
          currentPrice: 0,
          pnl: 0,
        });
      }

      const balance = tokenBalances.get(contractAddress)!;

      if (tokenTx.to.toLowerCase() === primaryUserAddress) {
        balance.totalIn = (parseFloat(balance.totalIn) + amount).toString();
      } else if (tokenTx.from.toLowerCase() === primaryUserAddress) {
        balance.totalOut = (parseFloat(balance.totalOut) + amount).toString();
      }

      balance.netAmount = (parseFloat(balance.totalIn) - parseFloat(balance.totalOut)).toString();
      balance.currentPrice = this.getTokenPrice(contractAddress);
      balance.pnl = parseFloat(balance.netAmount) * balance.currentPrice;
    });

    const tokenBalanceArray = Array.from(tokenBalances.values())
      .filter(balance => parseFloat(balance.totalIn) > 0 || parseFloat(balance.totalOut) > 0);
    
    const totalPNL = tokenBalanceArray.reduce((sum, balance) => sum + balance.pnl, 0);

    return {
      totalPNL,
      totalGasCost,
      tokenBalances: tokenBalanceArray,
      allTrades: allTrades.map(trade => this.toTradeDetail(trade))
        .sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp)),
      trades: alphaTradesData || [],
    };
  }
}