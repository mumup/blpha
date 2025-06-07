import type { Transaction, TokenTransaction, AlphaToken, AlphaTradeResult, AlphaTradeDetail, PNLResult, TokenBalance } from '../types';
import { STABLE_TOKENS, SCORE_LEVELS } from '../types';
import { MarketWebbService } from './coingecko';
import alphaTokens from '../assets/coins/56';

// Binance DEX Router地址 - 只计算与此地址交互的交易
const BINANCE_DEX_ROUTER = '0xb300000b72DEAEb607a12d5f54773D1C19c7028d'.toLowerCase();

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
          // 排除稳定币
          if (this.isStableCoin(addr)) return false;
          // 排除WBNB（我们已经有BNB价格）
          if (addr === STABLE_TOKENS.WBNB.toLowerCase()) return false;
          return true;
        });

      console.log(`Fetching prices for ${uniqueAddresses.length} tokens (excluded stablecoins and WBNB)`);

      // 获取代币价格
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
    
    // 优先使用实时价格
    const realTimePrice = this.realTimePrices.get(normalizedAddress);
    if (realTimePrice !== undefined) {
      return realTimePrice;
    }

    // 稳定币价格
    if (this.isStableCoin(contractAddress)) {
      return 1.0;
    }

    // WBNB价格
    if (normalizedAddress === STABLE_TOKENS.WBNB.toLowerCase()) {
      return this.bnbPrice;
    }

    // 使用Alpha代币配置中的价格
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

  // 计算Alpha交易分数
  analyzeAlphaTrades(transactions: Transaction[], tokenTransactions: TokenTransaction[]): AlphaTradeResult {
    const alphaTrades: AlphaTradeDetail[] = [];
    const allTrades: AlphaTradeDetail[] = []; // 包含所有交易，不仅是Alpha交易
    let totalValue = 0;

    // 创建交易哈希到主交易的映射
    const transactionMap = new Map<string, Transaction>();
    transactions.forEach(tx => {
      transactionMap.set(tx.hash, tx);
    });

    // 按哈希分组代币转账
    const tokenTxByHash = new Map<string, TokenTransaction[]>();
    tokenTransactions.forEach(tokenTx => {
      const hash = tokenTx.hash;
      if (!tokenTxByHash.has(hash)) {
        tokenTxByHash.set(hash, []);
      }
      tokenTxByHash.get(hash)!.push(tokenTx);
    });

    // 分析每个交易
    tokenTxByHash.forEach((tokenTxs, hash) => {
      const mainTx = transactionMap.get(hash);
      if (!mainTx || tokenTxs.length !== 2) return; // 需要正好2个代币转账（买入和卖出）

      const [tx1, tx2] = tokenTxs;
      let fromTx: TokenTransaction, toTx: TokenTransaction;

      // 确定哪个是流出，哪个是流入
      if (tx1.from.toLowerCase() === mainTx.from.toLowerCase()) {
        fromTx = tx1; // 用户发出的代币
        toTx = tx2;   // 用户收到的代币
      } else {
        fromTx = tx2;
        toTx = tx1;
      }

      const fromIsAlpha = this.isAlphaToken(fromTx.contractAddress);
      const toIsAlpha = this.isAlphaToken(toTx.contractAddress);
      const fromIsStable = this.isStableCoin(fromTx.contractAddress);
      // const toIsStable = this.isStableCoin(toTx.contractAddress);

      // 检查是否符合Alpha交易条件：购买Alpha代币
      const isValidAlphaTrade = 
        (fromIsStable && toIsAlpha) || // 稳定币 -> Alpha
        (fromTx.contractAddress.toLowerCase() === STABLE_TOKENS.WBNB.toLowerCase() && toIsAlpha) || // BNB -> Alpha
        (fromIsAlpha && toIsAlpha); // Alpha -> Alpha

      if (isValidAlphaTrade) {
        // 计算USD价值（使用实时价格）
        let usdValue = 0;
        if (fromIsStable) {
          usdValue = parseFloat(fromTx.value) / Math.pow(10, parseInt(fromTx.tokenDecimal));
        } else if (fromTx.contractAddress.toLowerCase() === STABLE_TOKENS.WBNB.toLowerCase()) {
          const bnbAmount = parseFloat(fromTx.value) / Math.pow(10, parseInt(fromTx.tokenDecimal));
          usdValue = bnbAmount * this.bnbPrice; // 使用实时BNB价格
        } else {
          // Alpha -> Alpha 的情况，使用 to 代币的实时价值
          const toAmount = parseFloat(toTx.value) / Math.pow(10, parseInt(toTx.tokenDecimal));
          const toTokenPrice = this.getTokenPrice(toTx.contractAddress);
          usdValue = toAmount * toTokenPrice;
        }

        if (usdValue > 0) {
          const tradeDetail = {
            hash,
            fromToken: fromTx.contractAddress,
            toToken: toTx.contractAddress,
            fromAmount: fromTx.value,
            toAmount: toTx.value,
            fromTokenSymbol: fromTx.tokenSymbol,
            toTokenSymbol: toTx.tokenSymbol,
            usdValue,
            timestamp: fromTx.timeStamp,
          };

          // 添加到Alpha交易列表（计入分数）
          alphaTrades.push(tradeDetail);
          totalValue += usdValue;
        }
      } else {
        // 非Alpha交易也要显示，但不计入分数
        let usdValue = 0;
        if (fromIsStable) {
          usdValue = parseFloat(fromTx.value) / Math.pow(10, parseInt(fromTx.tokenDecimal));
        } else if (fromTx.contractAddress.toLowerCase() === STABLE_TOKENS.WBNB.toLowerCase()) {
          const bnbAmount = parseFloat(fromTx.value) / Math.pow(10, parseInt(fromTx.tokenDecimal));
          usdValue = bnbAmount * this.bnbPrice;
        } else {
          // 使用实时价格计算其他代币
          const fromAmount = parseFloat(fromTx.value) / Math.pow(10, parseInt(fromTx.tokenDecimal));
          const fromTokenPrice = this.getTokenPrice(fromTx.contractAddress);
          usdValue = fromAmount * fromTokenPrice;
        }

        if (usdValue > 0) {
          allTrades.push({
            hash,
            fromToken: fromTx.contractAddress,
            toToken: toTx.contractAddress,
            fromAmount: fromTx.value,
            toAmount: toTx.value,
            fromTokenSymbol: fromTx.tokenSymbol,
            toTokenSymbol: toTx.tokenSymbol,
            usdValue,
            timestamp: fromTx.timeStamp,
          });
        }
      }
    });

    // 计算分数
    const score = this.calculateScore(totalValue);
    const nextLevelAmount = this.getNextLevelAmount(totalValue);

    // 合并所有交易并排序
    const combinedTrades = [...alphaTrades, ...allTrades].sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));

    return {
      totalValue,
      score,
      nextLevelAmount,
      trades: alphaTrades.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp)),
      allTrades: combinedTrades,
    };
  }

  // 计算分数
  private calculateScore(totalValue: number): number {
    let score = 0;
    
    // 首先按照基础等级计算
    for (const level of SCORE_LEVELS) {
      if (totalValue >= level.amount) {
        score = level.score;
      } else {
        break;
      }
    }
    
    // 如果超过了最高等级，继续按翻倍计算
    if (totalValue > SCORE_LEVELS[SCORE_LEVELS.length - 1].amount) {
      const lastLevel = SCORE_LEVELS[SCORE_LEVELS.length - 1];
      let currentAmount = lastLevel.amount;
      let currentScore = lastLevel.score;
      
      // 每翻一倍增加1分
      while (totalValue >= currentAmount * 2) {
        currentAmount *= 2;
        currentScore += 1;
      }
      
      score = currentScore;
    }
    
    return score;
  }

  // 获取距离下一等级的金额
  private getNextLevelAmount(totalValue: number): number {
    for (const level of SCORE_LEVELS) {
      if (totalValue < level.amount) {
        return level.amount - totalValue;
      }
    }
    // 如果超过了最高等级，按照指数增长继续计算
    const lastLevel = SCORE_LEVELS[SCORE_LEVELS.length - 1];
    let nextAmount = lastLevel.amount * 2;
    while (totalValue >= nextAmount) {
      nextAmount *= 2;
    }
    return nextAmount - totalValue;
  }

  // 计算PNL
  analyzePNL(transactions: Transaction[], tokenTransactions: TokenTransaction[]): PNLResult {
    const tokenBalances = new Map<string, TokenBalance>();
    let totalGasCost = 0;

    // 计算Gas费用
    transactions.forEach(tx => {
      const gasUsed = parseInt(tx.gasUsed);
      const gasPrice = parseInt(tx.gasPrice);
      const gasCostWei = gasUsed * gasPrice;
      const gasCostBNB = gasCostWei / Math.pow(10, 18);
      const gasCostUSD = gasCostBNB * 600; // 假设BNB价格$600
      totalGasCost += gasCostUSD;
    });

    // 分析代币流入流出 - 只计算与DEX Router交互的交易
    // 获取用户地址 - 从所有交易中提取用户地址
    const userAddresses = new Set<string>();
    transactions.forEach(tx => {
      userAddresses.add(tx.from.toLowerCase());
    });
    const primaryUserAddress = Array.from(userAddresses)[0] || '';
    
    // 过滤只与DEX Router交互的代币交易
    const dexTokenTransactions = tokenTransactions.filter(tokenTx => {
      const mainTx = transactions.find(tx => tx.hash === tokenTx.hash);
      if (!mainTx) return false;
      
      // 检查交易是否与DEX Router交互
      return mainTx.to.toLowerCase() === BINANCE_DEX_ROUTER || 
             mainTx.from.toLowerCase() === BINANCE_DEX_ROUTER;
    });

    console.log(`🔍 过滤DEX交易: ${dexTokenTransactions.length}/${tokenTransactions.length} 个代币交易与DEX Router交互`);
    
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
        // 流入
        balance.totalIn = (parseFloat(balance.totalIn) + amount).toString();
      } else if (tokenTx.from.toLowerCase() === primaryUserAddress) {
        // 流出
        balance.totalOut = (parseFloat(balance.totalOut) + amount).toString();
      }

      // 计算净余额
      balance.netAmount = (parseFloat(balance.totalIn) - parseFloat(balance.totalOut)).toString();

      // 获取实时价格并计算PNL
      balance.currentPrice = this.getTokenPrice(contractAddress);
      balance.pnl = parseFloat(balance.netAmount) * balance.currentPrice;
    });

    const tokenBalanceArray = Array.from(tokenBalances.values());
    const totalPNL = tokenBalanceArray.reduce((sum, balance) => sum + balance.pnl, 0);

    return {
      totalPNL: totalPNL,
      totalGasCost,
      // 包含所有有交易的代币，即使净余额为0（可能有盈亏）
      tokenBalances: tokenBalanceArray.filter(balance => 
        parseFloat(balance.totalIn) > 0 || parseFloat(balance.totalOut) > 0
      ),
    };
  }
} 