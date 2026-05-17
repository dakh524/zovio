import AsyncStorage from '@react-native-async-storage/async-storage';

const LENDING_KEY = '@zovio_lending_records';
const EXPENSES_KEY = '@zovio_expenses';
const ONBOARDING_KEY = '@zovio_onboarding';

export interface LendingRecord {
  id: string;
  name: string;
  phoneNumber?: string;
  amount: number;
  occasion: 'Dinner' | 'Trip' | 'Birthday' | 'Loan' | 'Gift';
  date: string;
  status: 'pending' | 'settled';
}

export interface Expense {
  id: string;
  category: 'Food' | 'Petrol' | 'Transport' | 'Shopping' | 'Others';
  amount: number;
  date: string;
  description?: string;
}

export const storage = {
  async getLendingRecords(): Promise<LendingRecord[]> {
    try {
      const data = await AsyncStorage.getItem(LENDING_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load lending records', e);
      return [];
    }
  },

  async saveLendingRecords(records: LendingRecord[]): Promise<void> {
    try {
      await AsyncStorage.setItem(LENDING_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('Failed to save lending records', e);
    }
  },

  async getExpenses(): Promise<Expense[]> {
    try {
      const data = await AsyncStorage.getItem(EXPENSES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load expenses', e);
      return [];
    }
  },

  async saveExpenses(expenses: Expense[]): Promise<void> {
    try {
      await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
    } catch (e) {
      console.error('Failed to save expenses', e);
    }
  },

  async hasCompletedOnboarding(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      return value === 'true';
    } catch (e) {
      return false;
    }
  },

  async setHasCompletedOnboarding(completed: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, completed ? 'true' : 'false');
    } catch (e) {
      console.error('Failed to save onboarding status', e);
    }
  },
};
