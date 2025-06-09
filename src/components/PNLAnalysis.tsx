import React, { useState } from 'react';
import type { PNLResult } from '../types';
import { formatUSD, formatNumber, formatTimestamp, shortenAddress } from '../utils';

interface PNLAnalysisProps {
  result: PNLResult;
}

export const PNLAnalysis: React.FC<PNLAnalysisProps> = ({ result }) => {
  const { totalPNL, totalGasCost, tokenBalances, allTrades = [], trades = [] } = result;

  const [isTradeDetailsExpanded, setIsTradeDetailsExpanded] = useState(false);
  
  // 盈利和亏损的代币分类
  const profitableTokens = tokenBalances.filter(token => token.pnl > 0);
  const losingTokens = tokenBalances.filter(token => token.pnl < 0);
  const zeroTokens = tokenBalances.filter(token => token.pnl === 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">💰 PNL 分析</h2>
      
      {/* 总览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`p-4 rounded-lg border-2 ${totalPNL >= 0 ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20' : 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20'}`}>
          <div className="text-center">
            <div className={`text-2xl font-bold ${totalPNL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {totalPNL >= 0 ? '📈' : '📉'} {formatUSD(Math.abs(totalPNL))}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              净盈亏 {totalPNL >= 0 ? '(盈利)' : '(亏损)'}
            </div>
          </div>
        </div>
        
        <div className="p-4 rounded-lg border-2 border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              ⛽ {formatUSD(totalGasCost)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Gas 费用
            </div>
          </div>
        </div>
        
        <div className="p-4 rounded-lg border-2 border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              🪙 {tokenBalances.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              涉及代币数
            </div>
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
              {isTradeDetailsExpanded ? '🔼' : '🔽'}
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

      {/* 代币详情 */}
      {tokenBalances.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">📊 代币持仓详情</h3>
          
          {/* 盈利代币 */}
          {profitableTokens.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-green-600 dark:text-green-400 mb-2 flex items-center">
                <span className="mr-2">📈</span>
                盈利代币 ({profitableTokens.length})
              </h4>
              <div className="space-y-2">
                {profitableTokens.map((token) => (
                  <div key={token.contractAddress} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-800 dark:text-white">{token.symbol}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{token.name}</span>
                      </div>
                      <div className="text-green-600 dark:text-green-400 font-bold">
                        +{formatUSD(token.pnl)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">净持仓:</span>
                        <div className="font-mono text-gray-900 dark:text-gray-100">{formatNumber(parseFloat(token.netAmount))}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">当前价格:</span>
                        <div className="font-mono text-gray-900 dark:text-gray-100">{formatUSD(token.currentPrice)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">流入:</span>
                        <div className="font-mono text-green-600 dark:text-green-400">{formatNumber(parseFloat(token.totalIn))}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">流出:</span>
                        <div className="font-mono text-red-600 dark:text-red-400">{formatNumber(parseFloat(token.totalOut))}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 亏损代币 */}
          {losingTokens.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-red-600 dark:text-red-400 mb-2 flex items-center">
                <span className="mr-2">📉</span>
                亏损代币 ({losingTokens.length})
              </h4>
              <div className="space-y-2">
                {losingTokens.map((token) => (
                  <div key={token.contractAddress} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-800 dark:text-white">{token.symbol}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{token.name}</span>
                      </div>
                      <div className="text-red-600 dark:text-red-400 font-bold">
                        {formatUSD(token.pnl)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">净持仓:</span>
                        <div className="font-mono text-gray-900 dark:text-gray-100">{formatNumber(parseFloat(token.netAmount))}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">当前价格:</span>
                        <div className="font-mono text-gray-900 dark:text-gray-100">{formatUSD(token.currentPrice)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">流入:</span>
                        <div className="font-mono text-green-600 dark:text-green-400">{formatNumber(parseFloat(token.totalIn))}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">流出:</span>
                        <div className="font-mono text-red-600 dark:text-red-400">{formatNumber(parseFloat(token.totalOut))}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 中性代币 */}
          {zeroTokens.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center">
                <span className="mr-2">➖</span>
                中性代币 ({zeroTokens.length})
              </h4>
              <div className="space-y-2">
                {zeroTokens.map((token) => (
                  <div key={token.contractAddress} className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-800 dark:text-white">{token.symbol}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{token.name}</span>
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 font-bold">
                        {formatUSD(0)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">净持仓:</span>
                        <div className="font-mono text-gray-900 dark:text-gray-100">{formatNumber(parseFloat(token.netAmount))}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">当前价格:</span>
                        <div className="font-mono text-gray-900 dark:text-gray-100">{formatUSD(token.currentPrice)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">流入:</span>
                        <div className="font-mono text-green-600 dark:text-green-400">{formatNumber(parseFloat(token.totalIn))}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">流出:</span>
                        <div className="font-mono text-red-600 dark:text-red-400">{formatNumber(parseFloat(token.totalOut))}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tokenBalances.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <span className="text-4xl mb-2 block">📊</span>
          <p>今日暂无代币交易</p>
          <p className="text-sm mt-1">进行一些代币交易来查看PNL分析</p>
        </div>
      )}
    </div>
  );
};