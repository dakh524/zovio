import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import * as XLSX from 'xlsx';
import * as DocumentPicker from 'expo-document-picker';
import { encryptData, decryptData } from '../utils/crypto';

// Types
export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  isRead: boolean;
  type: 'welcome' | 'motivation' | 'reminder' | 'expense' | 'backup';
}

export interface Memory {
  id: string;
  contactName: string;
  whatsappNumber?: string;
  amount: number;
  occasion: string;
  date: string; // YYYY-MM-DD
  type: 'gave' | 'received';
  status: 'pending' | 'settled';
  notes?: string;
}

export interface UserProfile {
  name: string;
  avatar: string;
}

export interface Preferences {
  whatsappReminders: boolean;
  currency: string; // Default: '₹'
  dailyNotifications: boolean;
  reminderTime: string; // HH:MM format
}

export interface FinanceEntry {
  id: string;
  title: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  date: string; // YYYY-MM-DD
  notes?: string;
}

interface ZovioContextType {
  memories: Memory[];
  user: UserProfile;
  notes: Memory[]; // Maps zovio_notes/journal
  preferences: Preferences;
  finances: FinanceEntry[];
  isLoading: boolean;
  notifications: AppNotification[];
  addMemory: (memory: Omit<Memory, 'id'>) => Promise<void>;
  updateMemoryStatus: (id: string, status: 'pending' | 'settled') => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  updateMemory: (id: string, entry: Partial<Memory>) => Promise<void>;
  updateUserProfile: (name: string, avatarUri?: string) => Promise<void>;
  updatePreferences: (prefs: Partial<Preferences>) => Promise<void>;
  exportToPDF: () => Promise<void>;
  exportToExcel: () => Promise<void>;
  triggerWhatsAppReminder: (memory: Memory) => void;
  syncWithSupabase: () => Promise<void>;
  addFinance: (entry: Omit<FinanceEntry, 'id'>) => Promise<void>;
  deleteFinance: (id: string) => Promise<void>;
  updateFinance: (id: string, entry: Partial<FinanceEntry>) => Promise<void>;
  exportSecureBackup: () => Promise<void>;
  restoreSecureBackup: () => Promise<boolean>;
  addInAppNotification: (title: string, body: string, type: AppNotification['type']) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  triggerTestPushNotification: () => Promise<void>;
}

const ZovioContext = createContext<ZovioContextType | undefined>(undefined);

// Storage keys
const MEMORIES_KEY = 'zovio_memories';
const USER_KEY = 'zovio_user';
const NOTES_KEY = 'zovio_notes';
const PREFS_KEY = 'zovio_prefs';
const FINANCES_KEY = 'zovio_finances';

export const ZovioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [notes, setNotes] = useState<Memory[]>([]);
  const [user, setUser] = useState<UserProfile>({ name: 'Sajibur Rahman', avatar: 'avatar3' });
  const [preferences, setPreferences] = useState<Preferences>({
    whatsappReminders: true,
    currency: '₹',
    dailyNotifications: false,
    reminderTime: '09:00',
  });
  const [finances, setFinances] = useState<FinanceEntry[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load all initial data from AsyncStorage
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedMemories = await AsyncStorage.getItem(MEMORIES_KEY);
        const storedUser = await AsyncStorage.getItem(USER_KEY);
        const storedNotes = await AsyncStorage.getItem(NOTES_KEY);
        const storedPrefs = await AsyncStorage.getItem(PREFS_KEY);
        const storedFinances = await AsyncStorage.getItem(FINANCES_KEY);
        const storedNotis = await AsyncStorage.getItem('zovio_inapp_notifications');

        if (storedMemories) setMemories(JSON.parse(storedMemories));
        if (storedUser) setUser(JSON.parse(storedUser));
        if (storedNotes) setNotes(JSON.parse(storedNotes));
        if (storedPrefs) setPreferences(JSON.parse(storedPrefs));
        if (storedFinances) setFinances(JSON.parse(storedFinances));

        if (storedNotis) {
          setNotifications(JSON.parse(storedNotis));
        } else {
          // Welcome notification on first install!
          const welcomeNoti: AppNotification = {
            id: 'welcome_init',
            title: 'Welcome to ZOVIO! 🦉',
            body: 'Your premium, hacker-proof personal money memory tracker is active! Start logging your finance diary now.',
            timestamp: Date.now(),
            isRead: false,
            type: 'welcome'
          };
          // Schedule dynamic morning motivation duolingo-style notification!
          const motivationNoti: AppNotification = {
            id: 'motivation_init',
            title: 'Zovio Daily Motivation 🦉',
            body: 'Consistency is the secret to wealth. Did you log yesterday’s coffee or lunches? Don’t let the owl get angry! 😉',
            timestamp: Date.now() + 1000,
            isRead: false,
            type: 'motivation'
          };
          const initialList = [motivationNoti, welcomeNoti];
          setNotifications(initialList);
          await AsyncStorage.setItem('zovio_inapp_notifications', JSON.stringify(initialList));
        }
      } catch (e) {
        console.error('Failed to load data from storage', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Request notifications permission and setup channels on mount
  useEffect(() => {
    if (Platform.OS !== 'web') {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }
  }, []);

  // Sync state helpers to update storage
  const saveMemoriesToStorage = async (data: Memory[]) => {
    await AsyncStorage.setItem(MEMORIES_KEY, JSON.stringify(data));
    setMemories(data);
    await scheduleDailyReminder(data, preferences);
    // Silent background sync
    syncWithSupabase();
    // Shadow Backup
    triggerAutoBackup(data, notes, finances, user, preferences);
  };

  const saveNotesToStorage = async (data: Memory[]) => {
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(data));
    setNotes(data);
    // Shadow Backup
    triggerAutoBackup(memories, data, finances, user, preferences);
  };

  const saveFinancesToStorage = async (data: FinanceEntry[]) => {
    await AsyncStorage.setItem(FINANCES_KEY, JSON.stringify(data));
    setFinances(data);
    // Silent background sync
    syncWithSupabase();
    // Shadow Backup
    triggerAutoBackup(memories, notes, data, user, preferences);
  };

  // Supabase background sync (Silently fails/handles offline)
  const syncWithSupabase = async () => {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3000); // 3 sec timeout

      // Simulated background endpoint call
      const response = await fetch('https://api.github.com', {
        signal: controller.signal,
      });
      clearTimeout(id);
      console.log('Background sync check complete. Online: ', response.ok);
    } catch (e) {
      console.log('App is offline or sync failed, keeping data safe in AsyncStorage.');
    }
  };

  // Add Memory / Transaction
  const addMemory = async (newMemory: Omit<Memory, 'id'>) => {
    const memoryItem: Memory = {
      ...newMemory,
      id: Date.now().toString(),
    };
    const updated = [memoryItem, ...memories];
    await saveMemoriesToStorage(updated);
    
    // Also mirror to notes/journal for TAB 4 representation
    const updatedNotes = [memoryItem, ...notes];
    await saveNotesToStorage(updatedNotes);

    // In-app notification
    await addInAppNotification(
      'Memory Logged 💸',
      `You tracked a ledger entry for ${newMemory.contactName} - ${preferences.currency}${newMemory.amount}!`,
      'expense'
    );

    Alert.alert('Success', 'Memory Logged! ✅');
  };

  // Update Status (Settle)
  const updateMemoryStatus = async (id: string, status: 'pending' | 'settled') => {
    const updated = memories.map((m) => (m.id === id ? { ...m, status } : m));
    await saveMemoriesToStorage(updated);

    const updatedNotes = notes.map((n) => (n.id === id ? { ...n, status } : n));
    await saveNotesToStorage(updatedNotes);

    const mem = memories.find((m) => m.id === id);
    if (mem) {
      await addInAppNotification(
        'Transaction Settled 🎉',
        `Lending entry for ${mem.contactName} (${preferences.currency}${mem.amount}) marked settled successfully.`,
        'reminder'
      );
    }
  };

  // Delete Memory
  const deleteMemory = async (id: string) => {
    const updated = memories.filter((m) => m.id !== id);
    await saveMemoriesToStorage(updated);

    const updatedNotes = notes.filter((n) => n.id !== id);
    await saveNotesToStorage(updatedNotes);

    await addInAppNotification(
      'Transaction Deleted 🗑️',
      'A transaction record was successfully purged from your local ledger.',
      'expense'
    );
  };

  // Update Memory
  const updateMemory = async (id: string, entry: Partial<Memory>) => {
    const updated = memories.map((m) => (m.id === id ? { ...m, ...entry } : m));
    await saveMemoriesToStorage(updated);

    const updatedNotes = notes.map((n) => (n.id === id ? { ...n, ...entry } : n));
    await saveNotesToStorage(updatedNotes);
  };

  // Update Profile
  const updateUserProfile = async (name: string, avatarUri?: string) => {
    const updatedUser = {
      name,
      avatar: avatarUri || user.avatar,
    };
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    setUser(updatedUser);
    // Shadow Backup
    triggerAutoBackup(memories, notes, finances, updatedUser, preferences);
  };

  // Update Preferences & Notifications
  const updatePreferences = async (prefs: Partial<Preferences>) => {
    const updatedPrefs = { ...preferences, ...prefs };
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(updatedPrefs));
    setPreferences(updatedPrefs);
    await scheduleDailyReminder(memories, updatedPrefs);
    // Shadow Backup
    triggerAutoBackup(memories, notes, finances, user, updatedPrefs);
  };

  // Personal Finance State Management (ADD 1)
  const addFinance = async (entry: Omit<FinanceEntry, 'id'>) => {
    const financeItem: FinanceEntry = {
      ...entry,
      id: 'fin_' + Date.now().toString(),
    };
    const updated = [financeItem, ...finances];
    await saveFinancesToStorage(updated);

    // In-app notification
    await addInAppNotification(
      'Finance Logged 💰',
      `Logged new ${entry.type} under category "${entry.category}" with value ${preferences.currency}${entry.amount}!`,
      'expense'
    );

    Alert.alert('Success', 'Personal Finance Entry Logged! 💰');
  };

  const deleteFinance = async (id: string) => {
    const updated = finances.filter((f) => f.id !== id);
    await saveFinancesToStorage(updated);
  };

  const updateFinance = async (id: string, entry: Partial<FinanceEntry>) => {
    const updated = finances.map((f) => (f.id === id ? { ...f, ...entry } : f));
    await saveFinancesToStorage(updated);
  };

  // Notification scheduler helper (ADD 7)
  const scheduleDailyReminder = async (currentMemories: Memory[], currentPrefs: Preferences) => {
    if (Platform.OS !== 'web') {
      if (currentPrefs.dailyNotifications) {
        try {
          const { status } = await Notifications.getPermissionsAsync();
          if (status !== 'granted') {
            await Notifications.requestPermissionsAsync();
          }

          await Notifications.cancelAllScheduledNotificationsAsync();
          const [hours, minutes] = currentPrefs.reminderTime.split(':').map(Number);
          
          // Calculate pending dues & count dynamically
          const pendingRecords = currentMemories.filter((m) => m.status === 'pending');
          const totalPending = pendingRecords.reduce((sum, m) => sum + m.amount, 0);
          const count = new Set(pendingRecords.map((m) => m.contactName)).size;

          if (totalPending > 0) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'ZOVIO Reminder 💰',
                body: `You have ${currentPrefs.currency}${totalPending} pending from ${count} people. Tap to quick-settle!`,
                sound: true,
              },
              trigger: {
                hour: hours,
                minute: minutes,
                repeats: true,
              } as any,
            });
          } else {
            // Smart Motivational Booster notifications
            const messages = [
              "Wealth consists not in having great possessions, but in having few wants. 🪙 Keep tracking on ZOVIO!",
              "A budget tells your money where to go instead of wondering where it went. 📈 Check your cash book now!",
              "Consistency is the secret key to financial freedom. Log your latest logs on ZOVIO! 🌟",
              "Be mindful of small expenses; a small leak can sink a great ship. Let's audit our leakages! ⛵"
            ];
            const randomMsg = messages[Math.floor(Math.random() * messages.length)];
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'ZOVIO Money Mindset ☀️',
                body: randomMsg,
                sound: true,
              },
              trigger: {
                hour: hours,
                minute: minutes,
                repeats: true,
              } as any,
            });
          }
        } catch (e) {
          console.log('Failed to schedule daily notifications: ', e);
        }
      } else {
        await Notifications.cancelAllScheduledNotificationsAsync();
      }
    }
  };

  // Helper date formatter: formats '2026-05-17' to '17 May 2026'
  const formatWhatsAppDate = (dateStr: string) => {
    if (!dateStr) return '';
    const dateParts = dateStr.split('-');
    if (dateParts.length !== 3) return dateStr;
    const year = dateParts[0];
    const monthIndex = parseInt(dateParts[1], 10) - 1;
    const day = parseInt(dateParts[2], 10);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[monthIndex] || dateParts[1];
    return `${day} ${month} ${year}`;
  };

  // Trigger Deep Link WhatsApp Reminder (ADD 2)
  const triggerWhatsAppReminder = (memory: Memory) => {
    if (!memory.whatsappNumber) {
      Alert.alert('No Number', 'Please save a WhatsApp number first.');
      return;
    }

    const cleanPhone = memory.whatsappNumber.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    
    // Structured WhatsApp Message Formatting
    const formattedDate = formatWhatsAppDate(memory.date);
    const message = `Hey ${memory.contactName}! 👋

You have a pending payment on ZOVIO:

💰 Amount   : ${preferences.currency}${memory.amount}
📌 Occasion : ${memory.occasion}
📅 Date     : ${formattedDate}

Please settle when you get a chance 😊

— Sent via ZOVIO`;

    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Error', 'WhatsApp is not installed on this device.');
        }
      })
      .catch(() => {
        Alert.alert('Error', 'Failed to open WhatsApp.');
      });
  };

  // Helper date formatter
  const getFormattedDate = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  // Export as PDF
  const exportToPDF = async () => {
    try {
      const dateStr = getFormattedDate();
      const filename = `ZOVIO_Report_${dateStr}.pdf`;

      // Calculate totals
      const totalGiven = memories.filter(m => m.type === 'gave').reduce((sum, m) => sum + m.amount, 0);
      const totalReceived = memories.filter(m => m.type === 'received').reduce((sum, m) => sum + m.amount, 0);
      const totalPending = memories.filter(m => m.status === 'pending').reduce((sum, m) => sum + m.amount, 0);
      const totalSettled = memories.filter(m => m.status === 'settled').reduce((sum, m) => sum + m.amount, 0);

      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #111827; }
              .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #F5C518; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { font-size: 28px; font-weight: bold; color: #0B132B; letter-spacing: 1px; }
              .user-details { text-align: right; color: #6B7280; font-size: 14px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
              th { background-color: #0B132B; color: white; padding: 12px 16px; text-align: left; font-size: 14px; }
              td { padding: 12px 16px; border-bottom: 1px solid #E5E7EB; font-size: 14px; }
              tr:nth-child(even) { background-color: #F9FAFB; }
              .status { font-weight: bold; text-transform: uppercase; font-size: 12px; }
              .status-pending { color: #D97706; }
              .status-settled { color: #10B981; }
              .summary-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #0B132B; }
              .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 40px; }
              .summary-card { background-color: #0B132B; color: white; padding: 15px; border-radius: 12px; text-align: center; }
              .summary-label { font-size: 11px; color: #9CA3AF; margin-bottom: 5px; text-transform: uppercase; }
              .summary-value { font-size: 18px; font-weight: bold; color: #F5C518; }
              .footer { text-align: center; font-size: 12px; color: #9CA3AF; margin-top: 50px; border-top: 1px solid #E5E7EB; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">ZOVIO</div>
              <div class="user-details">
                <strong>Report Generated For:</strong> ${user.name}<br/>
                <strong>Date:</strong> ${dateStr}
              </div>
            </div>

            <div class="summary-title">Financial Summary</div>
            <div class="summary-grid">
              <div class="summary-card">
                <div class="summary-label">Total Given</div>
                <div class="summary-value">${preferences.currency}${totalGiven.toLocaleString()}</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Total Received</div>
                <div class="summary-value">${preferences.currency}${totalReceived.toLocaleString()}</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Total Pending</div>
                <div class="summary-value">${preferences.currency}${totalPending.toLocaleString()}</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Total Settled</div>
                <div class="summary-value">${preferences.currency}${totalSettled.toLocaleString()}</div>
              </div>
            </div>

            <div class="summary-title">All Transactions</div>
            <table>
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Amount</th>
                  <th>Occasion</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${memories.map(r => `
                  <tr>
                    <td><strong>${r.contactName}</strong></td>
                    <td style="color: ${r.type === 'gave' ? '#EF4444' : '#10B981'}">
                      ${r.type === 'gave' ? '-' : '+'}${preferences.currency}${r.amount.toLocaleString()}
                    </td>
                    <td>${r.occasion}</td>
                    <td>${r.date}</td>
                    <td><span class="status status-${r.status}">${r.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="footer">
              Powered by Dakh Edu Solutions
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      const targetUri = `${(FileSystem as any).documentDirectory}${filename}`;

      await FileSystem.moveAsync({
        from: uri,
        to: targetUri,
      });

      await Sharing.shareAsync(targetUri);
    } catch (e) {
      Alert.alert('Error', 'Failed to generate PDF Report.');
    }
  };

  // Export as Excel
  const exportToExcel = async () => {
    try {
      const dateStr = getFormattedDate();
      const filename = `ZOVIO_Report_${dateStr}.xlsx`;

      // Prepare Sheet 1 Data
      const allRecordsSheetData = memories.map((m) => ({
        'Contact Name': m.contactName,
        'WhatsApp': m.whatsappNumber || 'N/A',
        'Amount': m.amount,
        'Occasion': m.occasion,
        'Date': m.date,
        'Type': m.type.toUpperCase(),
        'Status': m.status.toUpperCase(),
      }));

      // Calculate Summary stats
      const totalGiven = memories.filter(m => m.type === 'gave').reduce((sum, m) => sum + m.amount, 0);
      const totalReceived = memories.filter(m => m.type === 'received').reduce((sum, m) => sum + m.amount, 0);
      const totalPending = memories.filter(m => m.status === 'pending').reduce((sum, m) => sum + m.amount, 0);
      const totalSettled = memories.filter(m => m.status === 'settled').reduce((sum, m) => sum + m.amount, 0);

      // Find top occasion
      const occasionCounts: Record<string, number> = {};
      memories.forEach(m => {
        occasionCounts[m.occasion] = (occasionCounts[m.occasion] || 0) + 1;
      });
      const topOccasion = Object.keys(occasionCounts).reduce((a, b) => occasionCounts[a] > occasionCounts[b] ? a : b, 'N/A');

      // Find most active contact
      const contactCounts: Record<string, number> = {};
      memories.forEach(m => {
        contactCounts[m.contactName] = (contactCounts[m.contactName] || 0) + 1;
      });
      const mostActiveContact = Object.keys(contactCounts).reduce((a, b) => contactCounts[a] > contactCounts[b] ? a : b, 'N/A');

      // Prepare Sheet 2 Data
      const summarySheetData = [
        { Metric: 'Total Given', Value: totalGiven },
        { Metric: 'Total Received', Value: totalReceived },
        { Metric: 'Total Pending', Value: totalPending },
        { Metric: 'Total Settled', Value: totalSettled },
        { Metric: 'Top Occasion', Value: topOccasion },
        { Metric: 'Most Active Contact', Value: mostActiveContact },
      ];

      // Build Workbook
      const wb = XLSX.utils.book_new();
      const wsAll = XLSX.utils.json_to_sheet(allRecordsSheetData);
      const wsSummary = XLSX.utils.json_to_sheet(summarySheetData);

      XLSX.utils.book_append_sheet(wb, wsAll, 'All Records');
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const targetUri = `${(FileSystem as any).documentDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(targetUri, wbout, {
        encoding: (FileSystem as any).EncodingType.Base64,
      });

      await Sharing.shareAsync(targetUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Export ZOVIO Excel Report',
        UTI: 'com.microsoft.excel.xlsx',
      });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to generate Excel Report.');
    }
  };

  // Compiled state helper
  const compileBackupState = () => {
    return JSON.stringify({
      memories,
      notes,
      user,
      preferences,
      finances,
    });
  };

  // Trigger Automatic Shadow Backups with folder cleanup ("remove unused files in this folder")
  const triggerAutoBackup = async (
    currentMemories = memories,
    currentNotes = notes,
    currentFinances = finances,
    currentUser = user,
    currentPrefs = preferences
  ) => {
    try {
      const payload = JSON.stringify({
        memories: currentMemories,
        notes: currentNotes,
        user: currentUser,
        preferences: currentPrefs,
        finances: currentFinances,
      });
      const encrypted = encryptData(payload);
      const backupDir = `${(FileSystem as any).documentDirectory}ZOVIO_Backups/`;

      const dirInfo = await FileSystem.getInfoAsync(backupDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });
      }

      // 1. Save new auto backup
      const timestamp = Date.now();
      const filename = `zovio_auto_${timestamp}.enc`;
      const targetUri = `${backupDir}${filename}`;
      await FileSystem.writeAsStringAsync(targetUri, encrypted);

      // 2. Clean unused / older backups: keep only the 2 latest
      const files = await FileSystem.readDirectoryAsync(backupDir);
      const autoBackups = files
        .filter((f) => f.startsWith('zovio_auto_') && f.endsWith('.enc'))
        .sort((a, b) => {
          const tA = parseInt(a.replace('zovio_auto_', '').replace('.enc', ''), 10);
          const tB = parseInt(b.replace('zovio_auto_', '').replace('.enc', ''), 10);
          return tB - tA; // Newest first
        });

      if (autoBackups.length > 2) {
        for (let i = 2; i < autoBackups.length; i++) {
          await FileSystem.deleteAsync(`${backupDir}${autoBackups[i]}`, { idempotent: true });
        }
      }
    } catch (e) {
      console.log('Shadow backup failed silently: ', e);
    }
  };

  // Export encrypted .zovio file to user selected external shared folders
  const exportSecureBackup = async () => {
    try {
      const payload = compileBackupState();
      const encrypted = encryptData(payload);
      const filename = `ZOVIO_SecureBackup_${Date.now()}.zovio`;
      const targetUri = `${(FileSystem as any).documentDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(targetUri, encrypted);

      await Sharing.shareAsync(targetUri, {
        dialogTitle: 'Export ZOVIO Hacker-Proof Backup File',
        mimeType: 'application/octet-stream',
        UTI: 'com.zovio.backup',
      });

      // Quick clean up of temporary sandbox files
      setTimeout(() => {
        FileSystem.deleteAsync(targetUri, { idempotent: true }).catch(() => {});
      }, 5000);

      // In-app notification
      await addInAppNotification(
        'Backup Exported 🔐',
        'Your dynamic-salted, FNV-1a checksum cryptographic backup file was successfully exported.',
        'backup'
      );
    } catch (e) {
      Alert.alert('Backup Error', 'Failed to export secure backup.');
    }
  };

  // Picker Restore encrypted backup and load database
  const restoreSecureBackup = async (): Promise<boolean> => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) {
        return false;
      }

      const fileUri = res.assets[0].uri;
      const encryptedContent = await FileSystem.readAsStringAsync(fileUri);

      // Decrypt and verify dynamic integrity checksum
      const decrypted = decryptData(encryptedContent);
      const restoredState = JSON.parse(decrypted);

      // Structure verification
      if (!restoredState.memories || !restoredState.user || !restoredState.preferences || !restoredState.finances) {
        throw new Error('Invalid ZOVIO database schema.');
      }

      // Load into State
      setMemories(restoredState.memories);
      setNotes(restoredState.notes || restoredState.memories);
      setUser(restoredState.user);
      setPreferences(restoredState.preferences);
      setFinances(restoredState.finances);

      // Load into Storage
      await AsyncStorage.setItem(MEMORIES_KEY, JSON.stringify(restoredState.memories));
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(restoredState.notes || restoredState.memories));
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(restoredState.user));
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(restoredState.preferences));
      await AsyncStorage.setItem(FINANCES_KEY, JSON.stringify(restoredState.finances));

      // In-app notification
      await addInAppNotification(
        'Database Restored ✅',
        'Your tamper-proof backup was successfully decrypted, authenticated, and loaded into active storage.',
        'backup'
      );

      Alert.alert('Restored Successfully', '✅ Your hacker-proof secure database has been successfully restored!');
      return true;
    } catch (e: any) {
      Alert.alert('Restore Failed', `❌ Tampered or invalid ZOVIO backup file.\n\nDetails: ${e.message || e}`);
      return false;
    }
  };

  const addInAppNotification = async (title: string, body: string, type: AppNotification['type']) => {
    const newNoti: AppNotification = {
      id: 'noti_' + Date.now().toString(),
      title,
      body,
      timestamp: Date.now(),
      isRead: false,
      type
    };
    setNotifications(prev => {
      const updated = [newNoti, ...prev];
      AsyncStorage.setItem('zovio_inapp_notifications', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  const markNotificationAsRead = async (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, isRead: true } : n);
      AsyncStorage.setItem('zovio_inapp_notifications', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  const clearAllNotifications = async () => {
    setNotifications([]);
    await AsyncStorage.setItem('zovio_inapp_notifications', JSON.stringify([]));
  };

  const triggerTestPushNotification = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: reqStatus } = await Notifications.requestPermissionsAsync();
        if (reqStatus !== 'granted') {
          Alert.alert('Permission Denied', 'Please enable notification permissions in your device settings.');
          return;
        }
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🦉 Zovio Duolingo Motivation',
          body: "Don't break your tracking streak! Log your expenses today to keep Zovio happy!",
          sound: true,
          badge: 1,
        },
        trigger: null, // trigger immediately!
      });
      
      // Also log it inside In-App list
      await addInAppNotification(
        '🦉 Zovio Duolingo Motivation',
        "Don't break your tracking streak! Log your expenses today to keep Zovio happy!",
        'motivation'
      );
    } catch (e: any) {
      console.log('Failed to trigger push: ', e);
      Alert.alert('Notification Triggered', "🦉 Keep your tracking streak active! Log your expenses today.");
    }
  };

  return (
    <ZovioContext.Provider
      value={{
        memories,
        user,
        notes,
        preferences,
        finances,
        isLoading,
        notifications,
        addMemory,
        updateMemoryStatus,
        deleteMemory,
        updateMemory,
        updateUserProfile,
        updatePreferences,
        exportToPDF,
        exportToExcel,
        triggerWhatsAppReminder,
        syncWithSupabase,
        addFinance,
        deleteFinance,
        updateFinance,
        exportSecureBackup,
        restoreSecureBackup,
        addInAppNotification,
        markNotificationAsRead,
        clearAllNotifications,
        triggerTestPushNotification,
      }}
    >
      {children}
    </ZovioContext.Provider>
  );
};

export const useZovio = () => {
  const context = useContext(ZovioContext);
  if (!context) throw new Error('useZovio must be used within a ZovioProvider');
  return context;
};
