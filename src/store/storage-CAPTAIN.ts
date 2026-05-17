import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LendingRecord {
  id: string;
  name: string;
  amount: number;
  occasion: string;
  date: string;
  status: 'pending' | 'settled';
}

const STORAGE_KEY = '@zovio_lending_records';
const ONBOARDING_KEY = '@zovio_onboarding_complete';

export const storage = {
  getLendingRecords: async (): Promise<LendingRecord[]> => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  saveLendingRecords: async (records: LendingRecord[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error(e);
    }
  },

  hasCompletedOnboarding: async (): Promise<boolean> => {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      return value === 'true';
    } catch (e) {
      return false;
    }
  },

  setOnboardingComplete: async (isComplete: boolean) => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, isComplete ? 'true' : 'false');
    } catch (e) {
      console.error(e);
    }
  }
};
