import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';

interface SettingsProps {
  onApiKeyChange: (apiKey: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ onApiKeyChange }) => {
  const [apiKey, setApiKey] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true); // 默认收起

  useEffect(() => {
    const settings = StorageService.getSettings();
    setApiKey(settings.apiKey);
    if (settings.apiKey) {
      onApiKeyChange(settings.apiKey);
    }
  }, [onApiKeyChange]);

  const handleSave = () => {
    StorageService.saveSettings({ apiKey });
    onApiKeyChange(apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">⚙️ 设置</h2>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          {isCollapsed ? '🔽' : '🔼'}
        </button>
      </div>
      
      {!isCollapsed && (
        <div className="space-y-4 mt-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              BSCScan API 密钥
            </label>
            <div className="relative">
              <input
                id="apiKey"
                type={isVisible ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="请输入您的BSCScan API密钥"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
              />
              <button
                type="button"
                onClick={toggleVisibility}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {isVisible ? '🙈' : '👁️'}
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              在 <a 
                href="https://bscscan.com/apis" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
              >
                BSCScan
              </a> 获取免费API密钥
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleSave}
              disabled={!apiKey.trim()}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                apiKey.trim()
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              保存设置
            </button>
            
            {saved && (
              <div className="flex items-center text-green-600 dark:text-green-400">
                <span className="mr-1">✓</span>
                <span>已保存</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 