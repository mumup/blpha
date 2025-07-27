import axios from 'axios';
import type { ActivitiesResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_CALENDAR_API_BASE_URL;

export class CalendarService {
  static async getActivities() {
    const response = await axios.get<ActivitiesResponse>(`${API_BASE_URL}/api/activities`);
    return response.data;
  }

  static async getAlphaTokenPricesWithSymbols(symbols: string[]) {
    const response = await axios.post<Map<string, { price: number; symbol: string }>>(`${API_BASE_URL}/api/bn/token/list`, {
      symbols,
    });
    return response.data;
  }
}