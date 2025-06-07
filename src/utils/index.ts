// 验证以太坊地址格式
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// 缩短地址显示
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

// 格式化数字
export function formatNumber(num: number, decimals = 2): string {
  if (num === 0) return '0';
  if (Math.abs(num) < 0.01) return `${num.toFixed(6)}`;
  return num.toFixed(decimals);
}

// 格式化USD金额
export function formatUSD(amount: number): string {
  if (amount === 0) return '$0.00';
  if (Math.abs(amount) < 0.01) return `$${amount.toFixed(6)}`;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// 格式化大数值
export function formatLargeNumber(num: number): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return formatNumber(num);
}

// 格式化时间戳
export function formatTimestamp(timestamp: string): string {
  const date = new Date(parseInt(timestamp) * 1000);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 复制到剪贴板
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

// 获取进度条百分比
export function getProgressPercentage(current: number, target: number): number {
  if (target === 0) return 0;
  return Math.min((current / target) * 100, 100);
} 