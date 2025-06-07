import React, { useState } from 'react';
import type { AlphaTradeResult } from '../types';
import { formatUSD, formatTimestamp, shortenAddress, getProgressPercentage } from '../utils';

interface AlphaScoreProps {
  result: AlphaTradeResult;
}

export const AlphaScore: React.FC<AlphaScoreProps> = ({ result }) => {
  const { totalValue, score, nextLevelAmount, trades, allTrades } = result;
  const [isTradeDetailsExpanded, setIsTradeDetailsExpanded] = useState(false);
  
  // 计算进度条
  const currentLevelProgress = getProgressPercentage(totalValue, totalValue + nextLevelAmount);
  
  // 获取等级图标
  const getLevelIcon = (score: number) => {
    if (score >= 5) return '👑';
    if (score >= 4) return '💎';
    if (score >= 3) return '🥇';
    if (score >= 2) return '🥈';
    if (score >= 1) return '🥉';
    return '🔰';
  };

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
            <span className="text-4xl">{getLevelIcon(score)}</span>
            <div>
              <div className={`text-3xl font-bold ${getLevelColor(score)}`}>
                {score} 分
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Alpha积分
              </div>
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
            <span>距离下一等级</span>
            <span>{formatUSD(nextLevelAmount)}</span>
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

      {/* 交易详情 */}
      {allTrades.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              📊 交易详情 ({allTrades.length} 笔) - Alpha交易: {trades.length} 笔
            </h3>
            <button
              onClick={() => setIsTradeDetailsExpanded(!isTradeDetailsExpanded)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              {isTradeDetailsExpanded ? '🔼 收起' : '🔽 展开'}
            </button>
          </div>
          
          {isTradeDetailsExpanded && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {allTrades.map((trade, index) => {
                const isAlphaTrade = trades.some(alphaTrade => alphaTrade.hash === trade.hash);
                return (
                  <div
                    key={trade.hash}
                    className={`border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      isAlphaTrade ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          #{index + 1}
                        </span>
                        {isAlphaTrade && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs rounded-full">
                            Alpha
                          </span>
                        )}
                        <span className={`font-bold ${isAlphaTrade ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                          {formatUSD(trade.usdValue)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimestamp(trade.timestamp)}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-red-600 dark:text-red-400">出售:</span>
                        <span className="font-mono text-gray-900 dark:text-gray-100">
                          {(parseFloat(trade.fromAmount) / Math.pow(10, 18)).toFixed(4)}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">{trade.fromTokenSymbol}</span>
                      </div>
                      <span className="text-gray-400 dark:text-gray-500">→</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-green-600 dark:text-green-400">购买:</span>
                        <span className="font-mono text-gray-900 dark:text-gray-100">
                          {(parseFloat(trade.toAmount) / Math.pow(10, 18)).toFixed(4)}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">{trade.toTokenSymbol}</span>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
                      <a
                        href={`https://bscscan.com/tx/${trade.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                      >
                        {shortenAddress(trade.hash, 8)}
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

        {allTrades.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <span className="text-4xl mb-2 block">🤷‍♂️</span>
          <p>今日暂无Alpha代币交易</p>
          <p className="text-sm mt-1">尝试购买一些Alpha代币来获得积分！</p>
        </div>
      )}
    </div>
  );
}; 