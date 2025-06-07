import axios from 'axios';

const API_BASE_URL = 'https://www.marketwebb.me';

// API响应类型
interface BNBPriceResponse {
  symbol: string;
  price: string;
}

interface AlphaTokenData {
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

interface AlphaTokenListResponse {
  code: string;
  message: string | null;
  data: AlphaTokenData[];
  messageDetail: string | null;
  success: boolean;
}

export class MarketWebbService {
  private static bnbPriceCache: { price: number; timestamp: number } | null = null;
  private static alphaTokensCache: { tokens: Map<string, number>; timestamp: number } | null = null;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  // 检查缓存是否有效
  private static isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  // 获取BNB价格
  static async getBNBPrice(): Promise<number> {
    try {
      // 检查缓存
      if (this.bnbPriceCache && this.isCacheValid(this.bnbPriceCache.timestamp)) {
        return this.bnbPriceCache.price;
      }

      const response = await axios.get<BNBPriceResponse>(
        `${API_BASE_URL}/api/v3/ticker/price`,
        {
          params: {
            symbol: 'BNBUSDT',
          },
          timeout: 8000,
        }
      );

      const price = parseFloat(response.data.price);
      
      // 更新缓存
      this.bnbPriceCache = {
        price,
        timestamp: Date.now(),
      };

      console.log(`💰 获取BNB价格: $${price}`);
      return price;
    } catch (error) {
      console.error('Error fetching BNB price:', error);
      // 返回默认价格
      return 600;
    }
  }

  // 获取主要币种价格（保持兼容性）
  static async getMainCoinPrices(): Promise<{ btc: number; eth: number; bnb: number }> {
    const bnbPrice = await this.getBNBPrice();
    
    return {
      btc: 95000, // 默认BTC价格
      eth: 3500,  // 默认ETH价格
      bnb: bnbPrice,
    };
  }

  // 获取Alpha代币价格列表
  static async getAlphaTokenPrices(): Promise<Map<string, number>> {
    try {
      // 检查缓存
      if (this.alphaTokensCache && this.isCacheValid(this.alphaTokensCache.timestamp)) {
        console.log(`📋 使用Alpha代币价格缓存 (${this.alphaTokensCache.tokens.size} 个代币)`);
        return this.alphaTokensCache.tokens;
      }

      console.log('🔄 获取Alpha代币价格列表...');
      const response = await axios.get<AlphaTokenListResponse>(
        `${API_BASE_URL}/bapi/defi/v1/public/wallet-direct/buw/wallet/cex/alpha/all/token/list`,
        {
          timeout: 15000, // 15秒超时，因为数据较大
        }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error('API响应失败或数据为空');
      }

      // 过滤BSC链的代币并创建价格映射
      const priceMap = new Map<string, number>();
      const bscTokens = response.data.data.filter(token => token.chainName === 'BSC');
      
      bscTokens.forEach(token => {
        const price = parseFloat(token.price);
        if (!isNaN(price) && price > 0) {
          priceMap.set(token.contractAddress.toLowerCase(), price);
        }
      });

      // 更新缓存
      this.alphaTokensCache = {
        tokens: priceMap,
        timestamp: Date.now(),
      };

      console.log(`✅ 获取到 ${bscTokens.length} 个BSC Alpha代币价格`);
      return priceMap;
    } catch (error) {
      console.error('Error fetching Alpha token prices:', error);
      return new Map();
    }
  }

  // 获取代币价格（通过合约地址）
  static async getTokenPrices(contractAddresses: string[]): Promise<Map<string, number>> {
    try {
      if (contractAddresses.length === 0) {
        return new Map();
      }

      // 获取Alpha代币价格列表
      const alphaTokenPrices = await this.getAlphaTokenPrices();
      const priceMap = new Map<string, number>();

      // 查找请求的合约地址在Alpha代币列表中的价格
      contractAddresses.forEach(address => {
        const price = alphaTokenPrices.get(address.toLowerCase());
        if (price !== undefined) {
          priceMap.set(address.toLowerCase(), price);
        }
      });

      console.log(`🔍 找到 ${priceMap.size}/${contractAddresses.length} 个代币的价格`);
      return priceMap;
    } catch (error) {
      console.error('Error fetching token prices:', error);
      return new Map();
    }
  }

  // 缓存机制 - 避免重复请求
  static async getCachedTokenPrice(contractAddress: string): Promise<number | null> {
    try {
      const prices = await this.getTokenPrices([contractAddress]);
      return prices.get(contractAddress.toLowerCase()) || null;
    } catch (error) {
      console.error('Error getting cached token price:', error);
      return null;
    }
  }
}

// 保持向后兼容性的别名
export const CoinGeckoService = MarketWebbService; 