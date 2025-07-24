import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Layout } from '../components/Layout';
import { MarketWebbService } from '../services/cexapi';
import type { Activity, ActivitiesResponse } from '../types';

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
      
      // 并行获取活动数据和价格数据
      const [activitiesResponse, pricesResponse] = await Promise.all([
        fetch('https://calendar.blpha.xyz/api/activities'),
        MarketWebbService.getAlphaTokenPricesWithSymbols()
      ]);
      
      const data: ActivitiesResponse = await activitiesResponse.json();
      
      if (data.success) {
        setActivities(data.data);
        setTokenPrices(pricesResponse);
        categorizeActivities(data.data);
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
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200 hover:shadow-lg transition-shadow">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {activity.symbol}
              {calculateActivityValue(activity) && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  {calculateActivityValue(activity)}
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-600">{activity.name}</p>
          </div>
          <div className="flex flex-row items-end space-x-2">
            <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
              {getTypeLabel(activity.type)}
            </span>
            {/* <span className="text-xs text-gray-500 mt-1">{getChainLabel(activity.chain)}</span> */}
            {/* 显示第二阶段标签 */}
            {activity.isStage2 && (
              <span className="inline-block px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded mt-1">
                2
              </span>
            )}
            {/* 第二阶段都是先到先得，显示FCFS标志 */}
            {activity.isStage2 && (
              <span className="inline-block px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded mt-1">
                FCFS
              </span>
            )}
          </div>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">开始时间:</span>
            <span className="font-medium">{formatDateTime(activity.startTime)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">积分要求:</span>
            <span className="font-medium">{activity.pointsRequire === '' ? '待定' : activity.pointsRequire}</span>
          </div>
          {
            activity.amount && (
              <div className="flex justify-between">
                <span className="text-gray-600">数量:</span>
                <span className="font-medium">{activity.amount}</span>
              </div>   
            )
          }
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-gray-600 mb-4">{error}</p>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">活动日历</h1>
        <p className="text-gray-600">查看最新的 Alpha 活动信息</p>
      </div>

        {/* 今日活动 */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="w-2 h-8 bg-green-500 rounded-full mr-3"></div>
            <h2 className="text-2xl font-semibold text-gray-900">今日活动</h2>
            <span className="ml-3 px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
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
            <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
              <div className="text-gray-400 text-6xl mb-4">📅</div>
              <p className="text-gray-600">今日暂无活动</p>
            </div>
          )}
        </div>

        {/* 未来活动 */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-2 h-8 bg-blue-500 rounded-full mr-3"></div>
            <h2 className="text-2xl font-semibold text-gray-900">未来活动</h2>
            <span className="ml-3 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
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
            <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
              <div className="text-gray-400 text-6xl mb-4">🔮</div>
              <p className="text-gray-600">暂无未来活动</p>
            </div>
          )}
        </div>

        {/* 刷新按钮 */}
        <div className="mt-8 text-center">
          <button 
            onClick={fetchActivities}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center mx-auto"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            刷新活动
          </button>
        </div>
    </Layout>
  );
};

export default Activities; 