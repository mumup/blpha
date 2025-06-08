import { useState, useEffect } from "react";
// import { Settings } from './components/Settings';
import { AddressInput } from "./components/AddressInput";
import { AlphaScore } from "./components/AlphaScore";
import { PNLAnalysis } from "./components/PNLAnalysis";
import { MigrationDialog } from "./components/MigrationDialog";
import { BSCScanService } from "./services/bscscan";
import { TransactionAnalyzer } from "./services/analyzer";
import { StorageService } from "./services/storage";
import { shortenAddress } from "./utils";
import type { AlphaTradeResult, PNLResult } from "./types";

function App() {
  // const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentAddress, setCurrentAddress] = useState("");
  const [alphaResult, setAlphaResult] = useState<AlphaTradeResult | null>(null);
  const [pnlResult, setPnlResult] = useState<PNLResult | null>(null);
  const [error, setError] = useState("");
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);

  // 应用启动时执行数据迁移
  useEffect(() => {
    try {
      const migrationPerformed = StorageService.migrateOldData();
      console.log("Data migration check completed");

      if (migrationPerformed) {
        // 显示迁移完成对话框
        setShowMigrationDialog(true);
      }
    } catch (error) {
      console.error("Error during data migration:", error);
    }
  }, []);

  const handleMigrationConfirm = () => {
    window.location.reload();
  };

  const handleMigrationCancel = () => {
    setShowMigrationDialog(false);
  };

  // const handleApiKeyChange = (newApiKey: string) => {
  //   setApiKey(newApiKey);
  // };

  const handleAddressSubmit = async (address: string) => {
    // if (!apiKey) {
    //   setError('请先在设置中配置BSCScan API密钥');
    //   return;
    // }

    setLoading(true);
    setError("");
    setCurrentAddress(address);
    setAlphaResult(null);
    setPnlResult(null);

    try {
      // 初始化服务
      const bscscanService = new BSCScanService();
      const analyzer = new TransactionAnalyzer();

      // 获取今日数据
      const { transactions, tokenTransactions } =
        await bscscanService.getTodayData(address);

      // 获取所有涉及的代币地址，用于获取实时价格
      const contractAddresses = [
        ...new Set(tokenTransactions.map((tx) => tx.contractAddress)),
      ];

      // 更新实时价格
      await analyzer.updateRealTimePrices(contractAddresses);

      // 分析Alpha交易
      const alphaAnalysis = analyzer.analyzeAlphaTrades(
        transactions,
        tokenTransactions
      );
      setAlphaResult(alphaAnalysis);

      // 分析PNL
      const pnlAnalysis = analyzer.analyzePNL(transactions, tokenTransactions);
      setPnlResult(pnlAnalysis);
    } catch (err) {
      console.error("Analysis error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "分析过程中发生错误，请检查API密钥和网络连接"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      {/* 数据迁移对话框 */}
      <MigrationDialog
        isOpen={showMigrationDialog}
        onConfirm={handleMigrationConfirm}
        onCancel={handleMigrationCancel}
      />

      {/* 头部 */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                🚀 BSC Alpha 交易分析
              </h1>
            </div>
            <div className="text-right text-sm text-gray-500 dark:text-gray-400">
              <div>时间: UTC 00:00 - 23:59</div>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* 设置部分 */}
        {/* <Settings onApiKeyChange={handleApiKeyChange} /> */}

        {/* 地址输入 */}
        <AddressInput onAddressSubmit={handleAddressSubmit} loading={loading} />

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <span className="text-red-500 dark:text-red-400 mr-2">❌</span>
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
          </div>
        )}

        {/* 加载状态 */}
        {loading && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mr-3"></div>
              <div>
                <div className="text-blue-700 dark:text-blue-300 font-medium">
                  正在分析交易数据...
                </div>
                <div className="text-blue-600 dark:text-blue-400 text-sm mt-1">
                  正在获取{" "}
                  {currentAddress ? shortenAddress(currentAddress) : ""}{" "}
                  的今日交易记录
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 结果展示 */}
        {currentAddress && !loading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
            <div className="flex flex-col sm:flex-row items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                  分析结果
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  地址: {currentAddress}
                </p>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {new Date().toLocaleString("zh-CN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        )}

        {/* Alpha分数展示 */}
        {alphaResult && <AlphaScore result={alphaResult} />}

        {/* PNL分析展示 */}
        {pnlResult && <PNLAnalysis result={pnlResult} />}
      </main>

      {/* 页脚 */}
      <footer className="mt-6">
        <div className="author-info">
          {/* <div className="author-avatar">
            <img src="assets/f.jpg" alt="Freshguy Avatar" title="Freshguy" />
          </div> */}
          Made by Freshguy
          <a href="https://x.com/pnl233" target="_blank">
            <svg
              width="16"
              height="16"
              viewBox="0 0 1200 1227"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z"
                fill="#333333"
              />
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
