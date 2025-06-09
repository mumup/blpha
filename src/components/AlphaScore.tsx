import React from 'react';
import type { AlphaTradeResult } from '../types';
import { formatUSD, getProgressPercentage } from '../utils';

interface AlphaScoreProps {
  result: AlphaTradeResult;
}

export const AlphaScore: React.FC<AlphaScoreProps> = ({ result }) => {
  const { totalValue, actualValue, score, nextLevelAmount, levelInfo } = result;
  
  // 使用新的进度条计算（从0%开始）
  const currentLevelProgress = levelInfo.progress;
  
  // 获取等级图标
  // const getLevelIcon = (score: number) => {
  //   if (score >= 5) return '👑';
  //   if (score >= 4) return '💎';
  //   if (score >= 3) return '🥇';
  //   if (score >= 2) return '🥈';
  //   if (score >= 1) return '🥉';
  //   return '🔰';
  // };

  const getLevelColor = (score: number) => {
    if (score >= 5) return 'text-purple-600';
    if (score >= 4) return 'text-blue-600';
    if (score >= 3) return 'text-yellow-600';
    if (score >= 2) return 'text-gray-500';
    if (score >= 1) return 'text-orange-600';
    return 'text-gray-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">⭐ Alpha 分数</h2>
      
      {/* 分数总览 */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {/* <span className="text-4xl">{getLevelIcon(score)}</span> */}
            <div className="flex items-center space-x-2">
              <div className={`text-3xl font-bold ${getLevelColor(score)}`}>
                {score} 分
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 rounded-full px-2 py-1">2x</div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatUSD(totalValue)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              累计交易额
            </div>
          </div>
        </div>

        {/* 进度条 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>{formatUSD(levelInfo.currentLevel)}</span>
            <span>距离下一等级</span>
            <span>{formatUSD(levelInfo.nextLevel)}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${currentLevelProgress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            再交易 {formatUSD(nextLevelAmount)} 即可升级
          </div>
        </div>
      </div>
    </div>
  );
}; 