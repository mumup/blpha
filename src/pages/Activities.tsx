import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Layout } from '../components/Layout';
import type { Activity } from '../types';
import { CalendarService } from '../services/calendar';
import { LightningBoltIcon, UpdateIcon, BellIcon } from "@radix-ui/react-icons"

const Activities: React.FC = () => {
  const [, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayActivities, setTodayActivities] = useState<Activity[]>([]);
  const [futureActivities, setFutureActivities] = useState<Activity[]>([]);
  const [tokenPrices, setTokenPrices] = useState<Map<string, { price: number; symbol: string }>>(new Map());

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);

      const activitiesResponse = await CalendarService.getActivities();

      const symbols = activitiesResponse.data.map(activity => activity.symbol.toUpperCase());

      const pricesResponse = await CalendarService.getAlphaTokenPricesWithSymbols(symbols);
      
      if (activitiesResponse.success) {
        setActivities(activitiesResponse.data);
        setTokenPrices(pricesResponse.data.reduce((acc, curr) => {
          acc.set(curr.symbol.toUpperCase(), curr);
          return acc;
        }, new Map<string, { price: number; symbol: string }>()));
        categorizeActivities(activitiesResponse.data);
      } else {
        setError('获取活动数据失败');
      }
    } catch (err) {
      setError('网络请求失败');
      console.error('获取活动数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const categorizeActivities = (activities: Activity[]) => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const todayList: Activity[] = [];
    const futureList: Activity[] = [];

    activities.forEach(activity => {
      const startTime = new Date(activity.startTime);
      
      // 根据时间分类活动
      if (startTime >= todayStart && startTime < tomorrowStart) {
        todayList.push(activity);
      } else if (startTime >= tomorrowStart) {
        futureList.push(activity);
      }
    });

    setTodayActivities(todayList);
    setFutureActivities(futureList);
  };

  const formatDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return '-';
    
    const targetDate = dayjs(dateTimeStr);
    const today = dayjs();
    const tomorrow = today.add(1, 'day');
    const dayAfterTomorrow = today.add(2, 'day');
    
    // 检查是否为0点时间
    const isZeroTime = targetDate.hour() === 0 && targetDate.minute() === 0;
    
    // 当天的时间
    if (targetDate.isSame(today, 'day')) {
      if (isZeroTime) {
        return '待定';
      } else {
        return `${targetDate.format('HH:mm')}`;
      }
    }
    
    // 明天的时间
    if (targetDate.isSame(tomorrow, 'day')) {
      if (isZeroTime) {
        return '明天';
      } else {
        return `明天 ${targetDate.format('HH:mm')}`;
      }
    }
    
    // 后天的时间
    if (targetDate.isSame(dayAfterTomorrow, 'day')) {
      if (isZeroTime) {
        return '后天';
      } else {
        return `后天 ${targetDate.format('HH:mm')}`;
      }
    }
    
    // 超过后天的时间
    if (isZeroTime) {
      return targetDate.format('YYYY-MM-DD');
    } else {
      return targetDate.format('YYYY-MM-DD HH:mm');
    }
  };

  const getTypeLabel = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'booster': 'booster',
      'tge': 'TGE',
      'airdrop': '空投',
    };
    return typeMap[type] || type;
  };

  // const getChainLabel = (chain: string) => {
  //   const chainMap: { [key: string]: string } = {
  //     'BSC': 'BSC',
  //     'ETH': '以太坊',
  //     'POLYGON': 'Polygon'
  //   };
  //   return chainMap[chain] || chain;
  // };

  // 计算活动价值
  const calculateActivityValue = (activity: Activity): string => {
    if (!activity.amount || activity.amount === '') return '';
    
    // 通过symbol匹配价格
    const tokenData = tokenPrices.get(activity.symbol.toUpperCase());
    if (!tokenData || tokenData.price === 0) return '';
    
    const amount = parseFloat(activity.amount);
    if (isNaN(amount)) return '';
    
    const value = amount * tokenData.price;
    return `≈ $${value.toFixed(2)}`;
  };

  const ActivityCard: React.FC<{ activity: Activity }> = ({ activity }) => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow relative">
        {/* 第二阶段角标 */}
        {activity.isStage2 && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gray-400 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md">
            2
          </div>
        )}
        
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {activity.symbol}
              {calculateActivityValue(activity) && (
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  {calculateActivityValue(activity)}
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{activity.name}</p>
          </div>
          <div className="flex flex-row items-end space-x-2">
            <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
              {getTypeLabel(activity.type)}
            </span>
            {/* <span className="text-xs text-gray-500 mt-1">{getChainLabel(activity.chain)}</span> */}
            {/* 显示现货标志 */}
            {activity.isSpot && (
              <span className="inline-block px-2 py-1 text-xs font-medium bg-[#F0B90B] text-white rounded mt-1">
                现货
              </span>
            )}
            {/* 显示合约标志 */}
            {activity.isFutures && (
              <span className="inline-block px-2 py-1 text-xs font-medium bg-[#0ecb81] text-white rounded mt-1">
                合约
              </span>
            )}
            {/* 显示先到先得 闪电标志 */}
            {activity.isFCFS && (
              <LightningBoltIcon className="w-6 h-6 text-[#F0B90B] mt-1" />
            )}
          </div>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">开始时间:</span>
            <span className="font-medium text-gray-900 dark:text-white">{formatDateTime(activity.startTime)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">积分要求:</span>
            <span className="font-medium text-gray-900 dark:text-white">{activity.pointsRequire === '' ? '待定' : activity.pointsRequire}</span>
          </div>
          {
            activity.amount && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">数量:</span>
                <span className="font-medium text-gray-900 dark:text-white">{activity.amount}</span>
              </div>   
            )
          }
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 dark:text-red-400 text-xl mb-4">⚠️</div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button 
            onClick={fetchActivities}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">活动日历</h1>
            <p className="text-gray-600 dark:text-gray-400">查看最新的 Alpha 活动信息</p>
          </div>
          <div>
            <a href='webcal://calendar.blpha.xyz/api/webcal/future.ics' target='_blank'>
              <button className="px-3 py-1 text-sm bg-slate-400 text-white rounded-lg hover:bg-slate-500 transition-colors flex items-center">
                <BellIcon className="w-4 h-4 mr-2" />
                订阅
              </button>
            </a>
          </div>
        </div>
      </div>

        {/* 今日活动 */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="w-2 h-8 bg-green-500 rounded-full mr-3"></div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">今日活动</h2>
            <span className="ml-3 px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 text-sm font-medium rounded-full">
              {todayActivities.length} 个活动
            </span>
          </div>
          
          {todayActivities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {todayActivities.map((activity, index) => (
                <ActivityCard key={index} activity={activity} />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
              <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">📅</div>
              <p className="text-gray-600 dark:text-gray-400">今日暂无活动</p>
            </div>
          )}
        </div>

        {/* 未来活动 */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-2 h-8 bg-blue-500 rounded-full mr-3"></div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">未来活动</h2>
            <span className="ml-3 px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-sm font-medium rounded-full">
              {futureActivities.length} 个活动
            </span>
          </div>
          
          {futureActivities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {futureActivities.map((activity, index) => (
                <ActivityCard key={index} activity={activity} />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
              <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">🔮</div>
              <p className="text-gray-600 dark:text-gray-400">暂无未来活动</p>
            </div>
          )}
        </div>

        {/* 刷新按钮 */}
        <div className="mt-8 text-center">
          <button 
            onClick={fetchActivities}
            disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center mx-auto text-sm"
          >
            <UpdateIcon className="w-4 h-4 mr-2" />
            刷新活动
          </button>
        </div>
    </Layout>
  );
};

export default Activities; 