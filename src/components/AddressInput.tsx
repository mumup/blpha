import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { isValidAddress, shortenAddress } from '../utils';
import type { AddressHistory } from '../types';

interface AddressInputProps {
  onAddressSubmit: (address: string) => void;
  loading: boolean;
}

export const AddressInput: React.FC<AddressInputProps> = ({ onAddressSubmit, loading }) => {
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<AddressHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setHistory(StorageService.getAddressHistory());
  }, []);

  const handleSubmit = () => {
    if (!address.trim()) {
      setError('请输入地址');
      return;
    }

    if (!isValidAddress(address.trim())) {
      setError('请输入有效的以太坊地址');
      return;
    }

    setError('');
    const trimmedAddress = address.trim();
    StorageService.saveAddressToHistory(trimmedAddress);
    setHistory(StorageService.getAddressHistory());
    onAddressSubmit(trimmedAddress);
  };

  const handleHistoryClick = (historyAddress: string) => {
    setAddress(historyAddress);
    setShowHistory(false);
    setError('');
  };

  const handleRemoveFromHistory = (historyAddress: string, e: React.MouseEvent) => {
    e.stopPropagation();
    StorageService.removeAddressFromHistory(historyAddress);
    setHistory(StorageService.getAddressHistory());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">📍 地址查询</h2>
      
      <div className="space-y-4">
                  <div className="relative">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              BSC 地址
            </label>
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setError('');
                  }}
                  onKeyPress={handleKeyPress}
                  onFocus={() => setShowHistory(history.length > 0)}
                  placeholder="0x..."
                  autoComplete="off"
                  spellCheck="false"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                    error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
              
                              {/* 历史记录下拉菜单 */}
                {showHistory && history.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">最近查询</span>
                        <button
                          onClick={() => setShowHistory(false)}
                          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    {history.map((item) => (
                      <div
                        key={item.address}
                        onClick={() => handleHistoryClick(item.address)}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer group"
                      >
                        <div className="flex-1">
                          <div className="font-mono text-sm text-gray-900 dark:text-gray-100">{shortenAddress(item.address, 6)}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(item.timestamp).toLocaleString('zh-CN')}
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleRemoveFromHistory(item.address, e)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 transition-opacity p-1"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={loading || !address.trim()}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                loading || !address.trim()
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {loading ? '分析中...' : '分析'}
            </button>
          </div>
          
          {error && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          输入BSC链上的地址以分析今日的Alpha交易情况和PNL
        </p>
      </div>
    </div>
  );
}; 