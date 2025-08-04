import { Contract, JsonRpcProvider, ZeroAddress, parseUnits, formatUnits } from 'ethers';
import quoterV2ABI from '../abi/PancakeQuoterV2.json';

// 合约地址
const QUOTER_V2_ADDRESS = '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997';
const FACTORY_ADDRESS = '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865';

// BSC 网络配置
const USDT_ADDRESS = '0x55d398326f99059ff775485246999027b3197955';
const WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

// 费率定义
const FEE_0_01_PERCENT = 100;  // 0.01%

const factoryABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "", "type": "address" },
      { "internalType": "address", "name": "", "type": "address" },
      { "internalType": "uint24", "name": "", "type": "uint24" }
    ],
    "name": "getPool",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ERC20 ABI (用于获取代币小数位)
const erc20ABI = [
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  }
];

export class PancakePriceService {
  private static cache: Map<string, { price: number; timestamp: number }> = new Map();
  private static readonly CACHE_DURATION = 30 * 1000; // 30秒缓存
  private static pendingRequests: Map<string, Promise<number>> = new Map(); // 防止重复请求

  private static provider = new JsonRpcProvider('https://bsc-rpc.publicnode.com/');
  // 创建合约实例
  private static quoterContract = new Contract(QUOTER_V2_ADDRESS, quoterV2ABI, this.provider);
  private static factoryContract = new Contract(FACTORY_ADDRESS, factoryABI, this.provider);

  /**
   * 获取代币的小数位数
   */
  private static async getTokenDecimals(contractAddress: string): Promise<number> {
    try {
      const tokenContract = new Contract(contractAddress, erc20ABI, this.provider);
      const decimals = await tokenContract.decimals();
      return Number(decimals);
    } catch (error) {
      console.warn(`无法获取代币 ${contractAddress} 的小数位数，使用默认值 18`);
      return 18; // 默认使用18位小数
    }
  }

  /**
   * 尝试获取池子地址并计算价格
   */
  private static async tryGetPrice(
    tokenIn: string, 
    tokenOut: string, 
    fee: number, 
    amount: string,
    tokenDecimals: number
  ): Promise<{ price: number; priceSource: string } | null> {
    try {
      // 检查池子是否存在
      const poolAddress = await this.factoryContract.getPool(tokenIn, tokenOut, fee);
      if (poolAddress === ZeroAddress) {
        return null;
      }
      
      console.log(`🔍 获取到池子地址 (${fee/10000}%): ${poolAddress}`);

      // 使用activity.amount作为输入数量
      const amountIn = parseUnits(amount, tokenDecimals);

      const params = {
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        amountIn: amountIn,
        fee: fee,
        sqrtPriceLimitX96: 0,
      };

      // 获取代币价格
      const [amountOut] = await this.quoterContract.quoteExactInputSingle.staticCall(params);
      
      // 计算总价值
      // 注意：BSC上的USDT是18位小数，WBNB也是18位小数
      const outputDecimals = 18; 
      const amountOutFormatted = parseFloat(formatUnits(amountOut, outputDecimals));
      
      const priceSource = tokenOut === USDT_ADDRESS ? 'USDT' : 'WBNB';
      console.log(`💱 ${amount} 代币 = ${amountOutFormatted} ${priceSource}`);
      
      return { price: amountOutFormatted, priceSource };
      
    } catch (error) {
      console.error(`查询 ${fee/10000}% fee 池子失败:`, error);
      return null;
    }
  }

  /**
   * 从 PancakeSwap V3 获取代币价格
   */
  private static async getTokenPriceFromPancake(contractAddress: string, amount: string): Promise<number> {
    // 获取代币小数位数
    const tokenDecimals = await this.getTokenDecimals(contractAddress);
    
    // 1. 优先尝试 USDT 0.01% fee 池子
    console.log(`🔍 尝试获取 ${contractAddress} 对 USDT 的价格 (0.01% fee)...`);
    let result = await this.tryGetPrice(contractAddress, USDT_ADDRESS, FEE_0_01_PERCENT, amount, tokenDecimals);
    
    if (result && result.price > 0) {
      console.log(`✅ 通过 USDT 池子获取总价值: $${result.price}`);
      return result.price;
    }
    
    // 2. 如果 USDT 池子不存在，尝试使用多跳路由 (Token -> WBNB -> USDT)
    console.log(`🔍 尝试使用多跳路由获取价格...`);
    try {
      const usdtPrice = await this.getTokenToUsdtViaMultiHop(contractAddress, amount, tokenDecimals);
      if (usdtPrice > 0) {
        console.log(`✅ 通过多跳路由获取总价值: $${usdtPrice}`);
        return usdtPrice;
      }
    } catch (error) {
      console.error('多跳路由失败:', error);
    }
    
    throw new Error('未找到可用的流动性池或多跳路径');
  }

  /**
   * 使用多跳路由计算代币到USDT的价值 (代币 -> WBNB -> USDT)
   */
  private static async getTokenToUsdtViaMultiHop(
    tokenAddress: string, 
    amount: string, 
    tokenDecimals: number
  ): Promise<number> {
    try {
      console.log(`🔄 使用多跳路由计算 ${tokenAddress} -> WBNB -> USDT 的价格...`);
      
      // 构建路径: Token -> WBNB -> USDT
      const path = [tokenAddress, WBNB_ADDRESS, USDT_ADDRESS];
      
      // 尝试不同的费率组合
      const feeOptions = [
        [FEE_0_01_PERCENT, FEE_0_01_PERCENT], // 0.01% -> 0.01%
        // [FEE_0_01_PERCENT, 500],              // 0.01% -> 0.05%
        // [FEE_0_01_PERCENT, 3000],             // 0.01% -> 0.3%
      ];
      
      // 检查 Token -> WBNB 池子是否存在
      const pool1 = await this.factoryContract.getPool(tokenAddress, WBNB_ADDRESS, FEE_0_01_PERCENT);
      if (pool1 === ZeroAddress) {
        throw new Error('Token -> WBNB 池子不存在');
      }
      
      console.log(`🔍 找到 Token -> WBNB 池子: ${pool1}`);
      
      // 尝试不同的费率组合找到可用的路径
      for (const fees of feeOptions) {
        try {
          const pool2 = await this.factoryContract.getPool(WBNB_ADDRESS, USDT_ADDRESS, fees[1]);
          if (pool2 === ZeroAddress) {
            console.log(`⏭️  WBNB -> USDT 池子不存在 (${fees[1]/10000}% fee), 尝试下一个...`);
            continue;
          }
          
          console.log(`🔍 找到 WBNB -> USDT 池子: ${pool2} (${fees[1]/10000}% fee)`);
          
          // 使用指定数量作为输入
          const amountIn = parseUnits(amount, tokenDecimals);
          
          const encodedPath = this.encodePath(path, fees);
          console.log(`🔧 编码路径: ${encodedPath}`);
          
          // 调用多跳路由查询
          const [amountOut] = await this.quoterContract.quoteExactInput.staticCall(encodedPath, amountIn);
          
          // 计算总价值 (USDT是18位小数)
          const usdtAmount = parseFloat(formatUnits(amountOut, 18));
          
          console.log(`💱 多跳路由结果: ${amount} 代币 = ${usdtAmount} USDT (费率: ${fees[0]/10000}% -> ${fees[1]/10000}%)`);
          
          return usdtAmount;
          
        } catch (error) {
          console.error(`费率组合 ${fees[0]/10000}% -> ${fees[1]/10000}% 查询失败:`, error);
          continue;
        }
      }
      
      throw new Error('所有多跳路径尝试都失败了');
      
    } catch (error) {
      console.error('多跳路由查询失败:', error);
      throw error;
    }
  }
  
  /**
   * 编码路径用于多跳查询
   */
  private static encodePath(path: string[], fees: number[]): string {
    if (path.length !== fees.length + 1) {
      throw new Error('路径和费率数组长度不匹配');
    }
    
    let encoded = path[0].toLowerCase().replace('0x', '');
    
    for (let i = 0; i < fees.length; i++) {
      // 费率编码为3字节 (24位)
      const feeHex = fees[i].toString(16).padStart(6, '0');
      encoded += feeHex;
      
      // 下一个代币地址 (去掉0x前缀)
      encoded += path[i + 1].toLowerCase().replace('0x', '');
    }
    
    return '0x' + encoded;
  }

  /**
   * 获取代币价格（主入口方法）
   */
  static async getTokenPrice(contractAddress: string, amount: string = "1"): Promise<number> {
    const cacheKey = `${contractAddress.toLowerCase()}_${amount}`;

    // 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`📋 使用缓存价格: $${cached.price}`);
      return cached.price;
    }

    // 检查是否有正在进行的请求，避免重复请求
    const pendingRequest = this.pendingRequests.get(cacheKey);
    if (pendingRequest) {
      console.log(`⏳ 等待正在进行的请求完成: ${contractAddress}`);
      return pendingRequest;
    }

    // 创建新的请求
    const pricePromise = this.executeGetTokenPrice(contractAddress, amount, cacheKey);
    this.pendingRequests.set(cacheKey, pricePromise);

    try {
      const price = await pricePromise;
      return price;
    } finally {
      // 清理pending请求
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * 执行实际的价格获取逻辑
   */
  private static async executeGetTokenPrice(contractAddress: string, amount: string, cacheKey: string): Promise<number> {
    try {
      // 尝试从链上获取价格
      console.log(`🔍 正在获取 ${contractAddress} 的价格 (数量: ${amount})...`);

      let price = await this.getTokenPriceFromPancake(contractAddress, amount);

      // 更新缓存
      if (price > 0) {
        this.cache.set(cacheKey, { price, timestamp: Date.now() });
        console.log(`💰 获取到 ${contractAddress} 链上总价值: $${price} (数量: ${amount})`);
      } else {
        console.log(`❌ 无法获取 ${contractAddress} 的价格`);
        return 0;
      }

      return price;
    } catch (error) {
      console.error('获取代币价格失败:', error);
      return 0;
    }
  }

  /**
   * 清理缓存
   */
  static clearCache(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }
}