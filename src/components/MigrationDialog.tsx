import React from 'react';

interface MigrationDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const MigrationDialog: React.FC<MigrationDialogProps> = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        {/* 图标和标题 */}
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mr-4">
            <span className="text-2xl">🔄</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              数据迁移完成
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              已成功更新到新格式
            </p>
          </div>
        </div>

        {/* 内容 */}
        <div className="mb-6">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <span className="text-green-500 dark:text-green-400 mr-2">✅</span>
              <span className="text-green-700 dark:text-green-300 text-sm">
                检测到旧版本数据，已成功迁移到新格式
              </span>
            </div>
          </div>
          
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
            为了确保所有功能正常工作，建议刷新页面加载新的数据格式。
          </p>
          
          <p className="text-gray-500 dark:text-gray-400 text-xs">
            * 如果选择稍后刷新，部分功能可能无法正常使用
          </p>
        </div>

        {/* 按钮 */}
        <div className="flex space-x-3">
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition-colors"
          >
            立即刷新
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-md font-medium transition-colors"
          >
            稍后
          </button>
        </div>
      </div>
    </div>
  );
}; 