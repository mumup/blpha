import type { Settings, AddressHistory } from '../types';

const STORAGE_KEYS = {
  SETTINGS: 'bsc-tx-analyzer-settings',
  ADDRESS_HISTORY: 'bsc-tx-analyzer-address-history',
} as const;

export class StorageService {
  private static migrationCompleted = false;

  // 数据迁移 - 将旧版本的localStorage数据转换为新格式
  static migrateOldData(): boolean {
    // 避免重复执行迁移
    if (this.migrationCompleted) {
      return false;
    }

    try {
      let migrationPerformed = false;

      // 迁移API密钥
      const oldApiKey = localStorage.getItem('bscscanApiKey');
      if (oldApiKey && !localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
        console.log('🔄 迁移旧版API密钥到新格式');
        const settings: Settings = { apiKey: oldApiKey };
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
        localStorage.removeItem('bscscanApiKey');
        migrationPerformed = true;
      }

      // 迁移地址历史记录
      const oldHistory = localStorage.getItem('addressHistory');
      if (oldHistory && !localStorage.getItem(STORAGE_KEYS.ADDRESS_HISTORY)) {
        console.log('🔄 迁移旧版地址历史记录到新格式');
        try {
          const oldAddresses: string[] = JSON.parse(oldHistory);
          const newHistory: AddressHistory[] = oldAddresses.map((address, index) => ({
            address,
            timestamp: Date.now() - (index * 1000), // 为旧数据分配时间戳，保持顺序
          }));
          localStorage.setItem(STORAGE_KEYS.ADDRESS_HISTORY, JSON.stringify(newHistory));
          localStorage.removeItem('addressHistory');
          migrationPerformed = true;
        } catch (error) {
          console.error('Failed to parse old address history:', error);
          localStorage.removeItem('addressHistory');
        }
      }

      if (migrationPerformed) {
        console.log('✅ 数据迁移完成');
      }

      this.migrationCompleted = true;
      return migrationPerformed;
    } catch (error) {
      console.error('❌ 数据迁移失败:', error);
      this.migrationCompleted = true; // 即使失败也标记为完成，避免重复尝试
      return false;
    }
  }

  // 保存设置
  static saveSettings(settings: Settings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  // 获取设置
  static getSettings(): Settings {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    return { apiKey: '' };
  }

  // 保存地址到历史记录
  static saveAddressToHistory(address: string): void {
    try {
      const history = this.getAddressHistory();
      const existingIndex = history.findIndex(item => item.address.toLowerCase() === address.toLowerCase());
      
      if (existingIndex >= 0) {
        // 如果地址已存在，更新时间戳并移到最前面
        history[existingIndex].timestamp = Date.now();
        const item = history.splice(existingIndex, 1)[0];
        history.unshift(item);
      } else {
        // 添加新地址到最前面
        history.unshift({
          address,
          timestamp: Date.now(),
        });
      }

      // 限制历史记录数量为10个
      if (history.length > 10) {
        history.splice(10);
      }

      localStorage.setItem(STORAGE_KEYS.ADDRESS_HISTORY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save address to history:', error);
    }
  }

  // 获取地址历史记录
  static getAddressHistory(): AddressHistory[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ADDRESS_HISTORY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load address history:', error);
    }
    return [];
  }

  // 删除地址历史记录
  static removeAddressFromHistory(address: string): void {
    try {
      const history = this.getAddressHistory();
      const filtered = history.filter(item => item.address.toLowerCase() !== address.toLowerCase());
      localStorage.setItem(STORAGE_KEYS.ADDRESS_HISTORY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove address from history:', error);
    }
  }

  // 清空地址历史记录
  static clearAddressHistory(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.ADDRESS_HISTORY);
    } catch (error) {
      console.error('Failed to clear address history:', error);
    }
  }
} 