import axios from 'axios';
import type { BSCScanResponse, Transaction, TokenTransaction } from '../types';

const BSCSCAN_BASE_URL = import.meta.env.VITE_BSCSCAN_API_BASE_URL;;

export class BSCScanService {
  // private apiKey: string;
  
  // 当天开始区块号缓存
  private static todayStartBlockCache: { blockNumber: string; date: string } | null = null;

  constructor() {
    // this.apiKey = apiKey;
  }

  // 检查缓存是否为当天的
  private static isTodayCache(date: string): boolean {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD
    return date === todayString;
  }

  // 获取指定时间戳的区块号
  async getBlockByTimestamp(timestamp: number): Promise<string> {
    try {
      const response = await axios.get<BSCScanResponse<string>>(BSCSCAN_BASE_URL, {
        params: {
          module: 'block',
          action: 'getblocknobytime',
          timestamp,
          closest: 'before',
          // apikey: this.apiKey,
        },
      });

      if (response.data.status === '1') {
        return response.data.result;
      }
      throw new Error(response.data.message);
    } catch (error) {
      console.error('Error fetching block by timestamp:', error);
      throw error;
    }
  }

  // 获取当天开始的区块号（UTC 00:00）
  async getTodayStartBlock(): Promise<string> {
    // 检查缓存
    if (BSCScanService.todayStartBlockCache && BSCScanService.isTodayCache(BSCScanService.todayStartBlockCache.date)) {
      console.log(`📋 使用当天开始区块号缓存: ${BSCScanService.todayStartBlockCache.blockNumber}`);
      return BSCScanService.todayStartBlockCache.blockNumber;
    }

    console.log('🔄 获取当天开始的区块号...');
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const timestamp = Math.floor(todayStart.getTime() / 1000);
    const blockNumber = await this.getBlockByTimestamp(timestamp);
    
    // 更新缓存
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    BSCScanService.todayStartBlockCache = {
      blockNumber,
      date: today.toISOString().split('T')[0] // YYYY-MM-DD
    };
    
    console.log(`✅ 获取并缓存当天开始区块号: ${blockNumber}`);
    return blockNumber;
  }

  // 获取地址的所有交易记录
  async getTransactions(
    address: string,
    startBlock: string,
    endBlock: string = '99999999',
    page: number = 1,
    offset: number = 1000
  ): Promise<Transaction[]> {
    try {
      const response = await axios.get<BSCScanResponse<Transaction[]>>(BSCSCAN_BASE_URL, {
        params: {
          module: 'account',
          action: 'txlist',
          address,
          startblock: startBlock,
          endblock: endBlock,
          page,
          offset,
          sort: 'desc',
          // apikey: this.apiKey,
        },
      });

      if (response.data.status === '1') {
        return response.data.result;
      }
      return [];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  // 获取地址的所有ERC20代币转账记录
  async getTokenTransactions(
    address: string,
    startBlock: string,
    endBlock: string = '99999999',
    page: number = 1,
    offset: number = 1000
  ): Promise<TokenTransaction[]> {
    try {
      const response = await axios.get<BSCScanResponse<TokenTransaction[]>>(BSCSCAN_BASE_URL, {
        params: {
          module: 'account',
          action: 'tokentx',
          address,
          startblock: startBlock,
          endblock: endBlock,
          page,
          offset,
          sort: 'desc',
          // apikey: this.apiKey,
        },
      });

      if (response.data.status === '1') {
        return response.data.result;
      }
      return [];
    } catch (error) {
      console.error('Error fetching token transactions:', error);
      throw error;
    }
  }

  // 获取所有分页的交易记录
  async getAllTransactions(address: string, startBlock: string): Promise<Transaction[]> {
    let allTransactions: Transaction[] = [];
    let page = 1;
    const offset = 1000;

    while (true) {
      const transactions = await this.getTransactions(address, startBlock, '99999999', page, offset);
      if (transactions.length === 0) {
        break;
      }
      allTransactions = allTransactions.concat(transactions);
      if (transactions.length < offset) {
        break;
      }
      page++;
    }

    return allTransactions;
  }

  // 获取所有分页的代币转账记录
  async getAllTokenTransactions(address: string, startBlock: string): Promise<TokenTransaction[]> {
    let allTokenTransactions: TokenTransaction[] = [];
    let page = 1;
    const offset = 1000;

    while (true) {
      const tokenTransactions = await this.getTokenTransactions(address, startBlock, '99999999', page, offset);
      if (tokenTransactions.length === 0) {
        break;
      }
      allTokenTransactions = allTokenTransactions.concat(tokenTransactions);
      if (tokenTransactions.length < offset) {
        break;
      }
      page++;
    }

    return allTokenTransactions;
  }

  // 获取地址的当天所有数据
  async getTodayData(address: string) {
    const startBlock = await this.getTodayStartBlock();
    
    const [transactions, tokenTransactions] = await Promise.all([
      this.getAllTransactions(address, startBlock),
      this.getAllTokenTransactions(address, startBlock),
    ]);

    return {
      startBlock,
      transactions,
      tokenTransactions,
    };
  }
} 