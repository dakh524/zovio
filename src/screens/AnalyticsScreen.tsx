import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import Svg, { Circle, Path, Rect, Line, Polygon, Text as SvgText, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { useZovio } from '../store/ZovioContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';

const { width } = Dimensions.get('window');

// Robust date string parser to support all platforms and raw local string formats
const parseDateString = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  let d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;

  // Format: "17 May 2026"
  const parts = dateStr.trim().split(' ');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthStr = parts[1].toLowerCase();
    const year = parseInt(parts[2], 10);

    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthIdx = months.indexOf(monthStr.substring(0, 3));
    if (monthIdx !== -1 && !isNaN(day) && !isNaN(year)) {
      return new Date(year, monthIdx, day);
    }
  }
  return new Date();
};

export const AnalyticsScreen = () => {
  const { memories, preferences, finances } = useZovio();
  const [timeframe, setTimeframe] = useState<'Week' | 'Month' | 'Year'>('Week');
  const [track, setTrack] = useState<'friends' | 'personal'>('friends');

  // Custom Range State (Calendar Pickers)
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [rangeModalVisible, setRangeModalVisible] = useState(false);

  // Helper: Filter records by timeframe or custom range
  const getFilteredMemories = () => {
    return memories.filter((m) => {
      const recordDate = parseDateString(m.date);
      if (isCustomRange) {
        const rTime = recordDate.getTime();
        const sTime = new Date(startDate).setHours(0, 0, 0, 0);
        const eTime = new Date(endDate).setHours(23, 59, 59, 999);
        return rTime >= sTime && rTime <= eTime;
      }

      const now = new Date();
      const diffTime = Math.abs(now.getTime() - recordDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (timeframe === 'Week') return diffDays <= 7;
      if (timeframe === 'Month') return diffDays <= 30;
      if (timeframe === 'Year') return diffDays <= 365;
      return true;
    });
  };

  const getFilteredFinances = () => {
    return finances.filter((f) => {
      const recordDate = parseDateString(f.date);
      if (isCustomRange) {
        const rTime = recordDate.getTime();
        const sTime = new Date(startDate).setHours(0, 0, 0, 0);
        const eTime = new Date(endDate).setHours(23, 59, 59, 999);
        return rTime >= sTime && rTime <= eTime;
      }

      const now = new Date();
      const diffTime = Math.abs(now.getTime() - recordDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (timeframe === 'Week') return diffDays <= 7;
      if (timeframe === 'Month') return diffDays <= 30;
      if (timeframe === 'Year') return diffDays <= 365;
      return true;
    });
  };

  const filtered = getFilteredMemories();
  const filteredFinances = getFilteredFinances();

  // ==========================================
  // EXCEL & PDF EXPORT LOGIC
  // ==========================================
  const handleExportCSV = async () => {
    try {
      const friendsData = memories.map((m) => ({
        'Date': m.date,
        'Contact Name': m.contactName,
        'Type': m.type.toUpperCase(),
        'Amount': m.amount,
        'Occasion': m.occasion,
        'WhatsApp': m.whatsappNumber || 'N/A',
        'Status': m.status.toUpperCase(),
        'Notes': m.notes || '',
      }));

      const personalData = finances.map((f) => ({
        'Date': f.date,
        'Title / Source': f.title,
        'Type': f.type.toUpperCase(),
        'Amount': f.amount,
        'Category': f.category,
        'Notes': f.notes || '',
      }));

      const wb = XLSX.utils.book_new();
      const wsFriends = XLSX.utils.json_to_sheet(friendsData);
      const wsPersonal = XLSX.utils.json_to_sheet(personalData);

      XLSX.utils.book_append_sheet(wb, wsFriends, 'Friends & Family');
      XLSX.utils.book_append_sheet(wb, wsPersonal, 'Personal Finances');

      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const targetUri = `${(FileSystem as any).documentDirectory}ZOVIO_Complete_Spreadsheet_Report.xlsx`;

      await FileSystem.writeAsStringAsync(targetUri, wbout, {
        encoding: (FileSystem as any).EncodingType.Base64,
      });

      await Sharing.shareAsync(targetUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Export ZOVIO Excel Report',
        UTI: 'com.microsoft.excel.xlsx',
      });
    } catch (err) {
      Alert.alert('Export Failed', 'Could not compile XLSX spreadsheet report: ' + err);
    }
  };

  const handleExportPDF = async () => {
    try {
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 25px; color: #1A1A2E; }
              h1 { color: #F5C518; text-align: center; font-size: 28px; margin-bottom: 5px; }
              p.subtitle { text-align: center; color: #6B7280; font-size: 14px; margin-bottom: 30px; }
              h2 { color: #0B132B; border-bottom: 2px solid #F5C518; padding-bottom: 8px; margin-top: 35px; font-size: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #E5E7EB; padding: 12px; text-align: left; font-size: 13px; }
              th { background-color: #F9FAFB; font-weight: bold; color: #4B5563; }
              tr:nth-child(even) { background-color: #FAFAFA; }
              .type-in { color: #10B981; font-weight: bold; }
              .type-out { color: #EF4444; font-weight: bold; }
              .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
              .badge-settled { background-color: #E8F5E9; color: #2E7D32; }
              .badge-pending { background-color: #FFFDE7; color: #F5C518; }
            </style>
          </head>
          <body>
            <h1>ZOVIO Financial Audit Ledger</h1>
            <p class="subtitle">Complete Statement • Generated on ${new Date().toLocaleDateString()}</p>
            
            <h2>1. Friends & Family Lending Diaries</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Contact Name</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Occasion</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${memories.map(m => `
                  <tr>
                    <td>${m.date}</td>
                    <td>${m.contactName}</td>
                    <td class="${m.type === 'received' ? 'type-in' : 'type-out'}">${m.type.toUpperCase()}</td>
                    <td>${preferences.currency}${m.amount.toLocaleString()}</td>
                    <td>${m.occasion}</td>
                    <td><span class="badge ${m.status === 'settled' ? 'badge-settled' : 'badge-pending'}">${m.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <h2>2. Personal Finances Book</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Title / Source</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Category</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${finances.map(f => `
                  <tr>
                    <td>${f.date}</td>
                    <td>${f.title}</td>
                    <td class="${f.type === 'income' ? 'type-in' : 'type-out'}">${f.type.toUpperCase()}</td>
                    <td>${preferences.currency}${f.amount.toLocaleString()}</td>
                    <td>${f.category}</td>
                    <td>${f.notes || '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
    } catch (err) {
      Alert.alert('Export Failed', 'Could not compile PDF ledger: ' + err);
    }
  };

  // ==========================================
  // FRIENDS & FAMILY CALCULATIONS
  // ==========================================
  const categories = ['Food & Dining', 'Petrol', 'Transport', 'Shopping', 'Others'];
  const categoryColors = ['#F5C518', '#34D399', '#EF4444', '#60A5FA', '#8B5CF6'];

  const categoryTotals = categories.reduce((acc, cat) => {
    acc[cat] = filtered
      .filter((m) => {
        if (cat === 'Food & Dining') return m.occasion.toLowerCase() === 'dinner' || m.occasion.toLowerCase() === 'food';
        if (cat === 'Petrol') return m.occasion.toLowerCase() === 'trip';
        if (cat === 'Transport') return m.occasion.toLowerCase() === 'birthday';
        if (cat === 'Shopping') return m.occasion.toLowerCase() === 'gift';
        return m.occasion.toLowerCase() === 'loan' || !['dinner', 'food', 'trip', 'birthday', 'gift'].includes(m.occasion.toLowerCase());
      })
      .reduce((sum, m) => sum + m.amount, 0);
    return acc;
  }, {} as Record<string, number>);

  const totalSpent = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);

  const circumference = 282.7;
  let currentOffset = 0;
  const donutSlices = categories.map((cat, i) => {
    const amt = categoryTotals[cat];
    const percentage = totalSpent > 0 ? amt / totalSpent : 0;
    const strokeDasharray = `${(percentage * circumference).toFixed(1)} ${circumference}`;
    const rotation = (currentOffset * 360 - 90).toFixed(1);
    currentOffset += percentage;

    return {
      color: categoryColors[i],
      dasharray: strokeDasharray,
      rotation: Number(rotation),
      amount: amt,
      percent: Math.round(percentage * 100),
      label: cat,
    };
  });

  // Expense Trend
  const getTrendData = () => {
    if (timeframe === 'Week') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const totals = days.map((_, index) => {
        const dayRecords = filtered.filter((m) => {
          const d = parseDateString(m.date).getDay();
          const targetDay = index === 6 ? 0 : index + 1;
          return d === targetDay;
        });
        return dayRecords.reduce((sum, m) => sum + m.amount, 0);
      });
      return { labels: days, data: totals };
    } else if (timeframe === 'Month') {
      const periods = ['1-7', '8-15', '16-23', '24-31'];
      const totals = periods.map((_, idx) => {
        const startDay = idx * 8 + 1;
        const endDay = Math.min(31, (idx + 1) * 8);
        const dayRecords = filtered.filter((m) => {
          const dateNum = parseDateString(m.date).getDate();
          return dateNum >= startDay && dateNum <= endDay;
        });
        return dayRecords.reduce((sum, m) => sum + m.amount, 0);
      });
      return { labels: periods, data: totals };
    } else {
      const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
      const totals = quarters.map((_, idx) => {
        const monthRecords = filtered.filter((m) => {
          const month = parseDateString(m.date).getMonth();
          return month >= idx * 3 && month < (idx + 1) * 3;
        });
        return monthRecords.reduce((sum, m) => sum + m.amount, 0);
      });
      return { labels: quarters, data: totals };
    }
  };

  const trend = getTrendData();
  const maxVal = Math.max(...trend.data, 1000);

  const svgWidth = 320;
  const svgHeight = 150;
  const paddingX = 15;
  const paddingY = 20;

  const points = trend.data.map((val, idx) => {
    const x = paddingX + (idx / (trend.data.length - 1)) * (svgWidth - 2 * paddingX);
    const y = svgHeight - paddingY - (val / maxVal) * (svgHeight - 2 * paddingY);
    return { x, y, value: val };
  });

  const linePath = points.reduce((path, pt, i) => (i === 0 ? `M${pt.x},${pt.y}` : `${path} L${pt.x},${pt.y}`), '');
  const areaPath = points.length > 0 ? `${linePath} L${points[points.length - 1].x},${svgHeight - paddingY} L${points[0].x},${svgHeight - paddingY} Z` : '';

  // Highlight selected node (Concentric yellow glowing callout halo)
  const maxPointIdx = points.reduce((maxIdx, pt, idx, arr) => (pt.value > arr[maxIdx].value ? idx : maxIdx), 0);
  const selectedNode = points[maxPointIdx];

  // Quick Insights (Friends)
  const receivedSum = filtered.filter((m) => m.type === 'received').reduce((sum, m) => sum + m.amount, 0);
  const gaveSum = filtered.filter((m) => m.type === 'gave').reduce((sum, m) => sum + m.amount, 0);
  const savedThisMonth = receivedSum - gaveSum;

  const sortedSpent = Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a]);
  const avgLendingSize = filtered.length > 0 ? Math.round(gaveSum / filtered.length) : 0;
  const outstandingBalMap = filtered.filter(m => m.status === 'pending').reduce((acc, m) => {
    const w = m.type === 'gave' ? m.amount : -m.amount;
    acc[m.contactName] = (acc[m.contactName] || 0) + w;
    return acc;
  }, {} as Record<string, number>);

  const sortedDebtors = Object.keys(outstandingBalMap).sort((a, b) => outstandingBalMap[b] - outstandingBalMap[a]);
  const highestDebtorName = sortedDebtors[0] || 'N/A';
  const highestDebtorAmt = outstandingBalMap[highestDebtorName] || 0;

  // ==========================================
  // PERSONAL FINANCE CALCULATIONS
  // ==========================================
  const getLast6Months = () => {
    const result = [];
    const date = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      result.push({
        label: d.toLocaleString('default', { month: 'short' }),
        key: d.toISOString().substring(0, 7),
      });
    }
    return result;
  };
  const last6Months = getLast6Months();

  const monthlyBarData = last6Months.map((m) => {
    const monthFinances = filteredFinances.filter((f) => f.date.startsWith(m.key));
    const income = monthFinances.filter((f) => f.type === 'income').reduce((sum, f) => sum + f.amount, 0);
    const expense = monthFinances.filter((f) => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);
    return { label: m.label, income, expense };
  });

  const expenseCategories = ['Rent', 'Food', 'Travel', 'Bills', 'Shopping', 'Entertainment', 'Other'];
  const expenseColors = ['#F87171', '#F5C518', '#60A5FA', '#34D399', '#8B5CF6', '#EC4899', '#9CA3AF'];

  const personalCategoryTotals = expenseCategories.reduce((acc, cat) => {
    acc[cat] = filteredFinances
      .filter((f) => f.type === 'expense' && f.category === cat)
      .reduce((sum, f) => sum + f.amount, 0);
    return acc;
  }, {} as Record<string, number>);

  const totalPersonalSpent = Object.values(personalCategoryTotals).reduce((sum, val) => sum + val, 0);

  let personalOffset = 0;
  const personalDonutSlices = expenseCategories.map((cat, i) => {
    const amt = personalCategoryTotals[cat];
    const percentage = totalPersonalSpent > 0 ? amt / totalPersonalSpent : 0;
    const strokeDasharray = `${(percentage * circumference).toFixed(1)} ${circumference}`;
    const rotation = (personalOffset * 360 - 90).toFixed(1);
    personalOffset += percentage;

    return {
      color: expenseColors[i],
      dasharray: strokeDasharray,
      rotation: Number(rotation),
      amount: amt,
      percent: Math.round(percentage * 100),
      label: cat,
    };
  });

  // Net Savings rate and Cash flow
  const totalPersonalIncome = filteredFinances.filter((f) => f.type === 'income').reduce((sum, f) => sum + f.amount, 0);
  const totalPersonalExpenses = filteredFinances.filter((f) => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);
  const totalPersonalSavings = totalPersonalIncome - totalPersonalExpenses;
  const savingsRate = totalPersonalIncome > 0 ? Math.round((totalPersonalSavings / totalPersonalIncome) * 100) : 0;

  // Extra Personal deep metrics
  const dailySpendRate = Math.round(totalPersonalExpenses / 30);
  const largestTx = filteredFinances.sort((a, b) => b.amount - a.amount)[0];

  // Dynamic Efficiency Score
  const getEfficiencyScore = () => {
    if (savingsRate > 35) return { badge: 'High Asset Growth 🌟', desc: 'Outstanding asset build rate!', color: '#34D399' };
    if (savingsRate > 15) return { badge: 'Steady Build 👍', desc: 'Secure cash reserves built.', color: '#60A5FA' };
    if (savingsRate >= 0) return { badge: 'Tight Position ⚠️', desc: 'Outflows almost match total earnings.', color: '#F5C518' };
    return { badge: 'Cash Deficit 🚨', desc: 'Expenses are outpacing total income.', color: '#F87171' };
  };
  const healthScore = getEfficiencyScore();

  // ==========================================
  // JAPANESE CANDLESTICK BUILDER
  // ==========================================
  const candlestickData = last6Months.map((m) => {
    const monthFinances = filteredFinances.filter((f) => f.date.startsWith(m.key));
    const open = 2000;
    const income = monthFinances.filter((f) => f.type === 'income').reduce((sum, f) => sum + f.amount, 0);
    const expense = monthFinances.filter((f) => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);
    const close = open + (income - expense);
    const high = Math.max(open, close, open + income);
    const low = Math.min(open, close, Math.max(0, open - expense));
    return { label: m.label, open, close, high, low };
  });

  const maxCandleVal = Math.max(...candlestickData.map(c => c.high), 5000);

  // ==========================================
  // PENTAGON RADAR SPIDER GRID
  // ==========================================
  const radarRadius = 45;
  const radarCenter = 75;
  const maxRadarVal = Math.max(...Object.values(categoryTotals), 1000);

  const radarPoints = categories.map((cat, i) => {
    const amt = categoryTotals[cat];
    const val = maxRadarVal > 0 ? (amt / maxRadarVal) * radarRadius : 0;
    const angle = i * (2 * Math.PI / 5) - Math.PI / 2;
    const x = radarCenter + val * Math.cos(angle);
    const y = radarCenter + val * Math.sin(angle);
    return { x, y, label: cat };
  });

  const radarPolygonPath = radarPoints.map(p => `${p.x},${p.y}`).join(' ');

  const drawPentagonGrid = (scale: number) => {
    return categories.map((_, i) => {
      const angle = i * (2 * Math.PI / 5) - Math.PI / 2;
      const x = radarCenter + (radarRadius * scale) * Math.cos(angle);
      const y = radarCenter + (radarRadius * scale) * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
  };

  // Speedometer Gauge specs
  const targetGoal = 25000;
  const goalProgress = Math.min(100, Math.max(0, Math.round((totalPersonalSavings / targetGoal) * 100)));

  // ==========================================
  // 📲 NEW CHART TYPES INTEGRATION
  // ==========================================

  // 1. COMBINED BAR & LINE CASH FLOW CHART ("柱折图")
  // Vertical bars show Income, smooth line shows Expenses over the last 6 months.
  const combinedMax = Math.max(...monthlyBarData.map(d => Math.max(d.income, d.expense)), 3000);
  const combinedLinePoints = monthlyBarData.map((d, idx) => {
    const stepX = (svgWidth - 40) / 5;
    const x = 20 + idx * stepX + 10;
    const y = svgHeight - paddingY - (d.expense / combinedMax) * (svgHeight - 2 * paddingY);
    return { x, y };
  });
  const combinedLinePath = combinedLinePoints.reduce((path, pt, i) => (i === 0 ? `M${pt.x},${pt.y}` : `${path} L${pt.x},${pt.y}`), '');

  // 2. DOUBLE STACKED BAR CHART ("堆叠柱状图")
  // Compares Friends Lending Diaries: Spent (Lent) vs Settled over timeframe periods.
  const stackedMax = Math.max(gaveSum, receivedSum, 2000);
  const lentHeight = (gaveSum / stackedMax) * 100;
  const settledHeight = (receivedSum / stackedMax) * 100;

  // 3. TRANSACTION SCATTER BUBBLE CHART ("散点图")
  // Maps transaction sizes as glowing floating bubbles over days of the month.
  const scatterTransactions = filteredFinances.length > 0 
    ? filteredFinances.slice(0, 10) 
    : [
        { date: '2026-05-02', amount: 800, title: 'Rent partial' },
        { date: '2026-05-10', amount: 1500, title: 'Dining' },
        { date: '2026-05-15', amount: 2200, title: 'Freelance' },
        { date: '2026-05-20', amount: 450, title: 'Bills' },
        { date: '2026-05-25', amount: 1200, title: 'Shopping' }
      ];
  const maxScatterAmount = Math.max(...scatterTransactions.map(t => t.amount), 1000);

  // Custom Light Yellow and Warm White Panel Card Frame
  const CyberPanel = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.cyberCard}>
      {/* Absolute Corner Anchors (Yellow themed) */}
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />

      <Text style={styles.panelTitle}>{title}</Text>
      {children}
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Audit Desk</Text>
        <TouchableOpacity style={styles.calendarBtn} onPress={() => setRangeModalVisible(true)}>
          <Icon
            name="calendar-outline"
            size={20}
            color={COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Date Range Indicator */}
      {isCustomRange && (
        <View style={styles.customRangeIndicator}>
          <Text style={styles.customRangeText}>
            📅 {startDate.toLocaleDateString()} — {endDate.toLocaleDateString()}
          </Text>
          <TouchableOpacity onPress={() => setIsCustomRange(false)}>
            <Icon name="close-circle" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}

      {/* Friends vs Personal Track Selector */}
      <View style={styles.trackSelector}>
        <TouchableOpacity
          style={[styles.trackBtn, track === 'friends' && styles.trackBtnActive]}
          onPress={() => setTrack('friends')}
        >
          <Text style={[styles.trackBtnText, track === 'friends' && styles.trackBtnTextActive]}>
            Lending Diaries
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.trackBtn, track === 'personal' && styles.trackBtnActive]}
          onPress={() => setTrack('personal')}
        >
          <Text style={[styles.trackBtnText, track === 'personal' && styles.trackBtnTextActive]}>
            Personal Ledger
          </Text>
        </TouchableOpacity>
      </View>

      {track === 'friends' ? (
        <>
          {/* Timeframe Selector */}
          {!isCustomRange && (
            <View style={styles.segmentControl}>
              {(['Week', 'Month', 'Year'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTimeframe(t)}
                  style={timeframe === t ? styles.segmentActive : styles.segmentInactive}
                >
                  <Text style={timeframe === t ? styles.segmentTextActive : styles.segmentText}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 1. AREA LINE CHART WITH SELECT HALO (折线面积图) */}
          <CyberPanel title="折线面积图 — Expense Trend">
            <View style={styles.chartWrapper}>
              <View style={styles.chartWithYAxis}>
                <View style={styles.yAxisLabels}>
                  <Text style={styles.yAxisText}>{preferences.currency}{Math.round(maxVal)}</Text>
                  <Text style={styles.yAxisText}>{preferences.currency}{Math.round(maxVal * 0.5)}</Text>
                  <Text style={styles.yAxisText}>{preferences.currency}0</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Svg width="100%" height={150} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                    <Defs>
                      <LinearGradient id="yellowArea" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="#F5C518" stopOpacity="0.4" />
                        <Stop offset="100%" stopColor="#F5C518" stopOpacity="0.0" />
                      </LinearGradient>
                    </Defs>
                    {/* Grid Background Lines */}
                    <Path d={`M0,20 L${svgWidth},20`} stroke="#F0F0F0" strokeWidth="1" strokeDasharray="3,3" />
                    <Path d={`M0,65 L${svgWidth},65`} stroke="#F0F0F0" strokeWidth="1" strokeDasharray="3,3" />
                    <Path d={`M0,110 L${svgWidth},110`} stroke="#F0F0F0" strokeWidth="1" strokeDasharray="3,3" />
                    <Path d={`M0,130 L${svgWidth},130`} stroke="#E5E7EB" strokeWidth="1" />

                    {/* Shaded Area fill */}
                    {areaPath !== '' && <Path d={areaPath} fill="url(#yellowArea)" />}

                    {/* Smooth Yellow Line */}
                    {linePath !== '' && <Path d={linePath} fill="none" stroke="#F5C518" strokeWidth="2.5" />}

                    {/* Selected Node Highlight concentric rings */}
                    {selectedNode && (
                      <>
                        <Circle cx={selectedNode.x} cy={selectedNode.y} r="9" fill="rgba(245, 197, 24, 0.25)" />
                        <Circle cx={selectedNode.x} cy={selectedNode.y} r="5" fill="rgba(245, 197, 24, 0.5)" />
                        <Circle cx={selectedNode.x} cy={selectedNode.y} r="2.5" fill="#FFFFFF" stroke="#F5C518" strokeWidth="1.5" />
                        {/* Selected value float badge */}
                        <Rect
                          x={selectedNode.x - 22}
                          y={selectedNode.y - 28}
                          width="44"
                          height="18"
                          rx="4"
                          fill="#1A1A2E"
                          stroke="#F5C518"
                          strokeWidth="1"
                        />
                        <SvgText
                          x={selectedNode.x}
                          y={selectedNode.y - 15}
                          fill="#F5C518"
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {preferences.currency}{selectedNode.value}
                        </SvgText>
                      </>
                    )}
                  </Svg>
                </View>
              </View>

              <View style={styles.chartXAxis}>
                {trend.labels.map((d) => (
                  <Text key={d} style={styles.xAxisText}>{d}</Text>
                ))}
              </View>
            </View>
          </CyberPanel>

          {/* 2. DOUBLE STACKED BAR CHART ("堆叠柱状图") */}
          <CyberPanel title="堆叠柱状图 — Flow Comparison">
            <View style={styles.stackedLayout}>
              <View style={styles.stackedBarContainer}>
                {/* Left Stacked Column (Lent/Gave) */}
                <View style={styles.stackedColumn}>
                  <View style={styles.stackedBarFrame}>
                    <View style={[styles.stackedPart, { height: `${lentHeight}%`, backgroundColor: '#F5C518' }]} />
                    <View style={[styles.stackedEmpty, { height: `${100 - lentHeight}%` }]} />
                  </View>
                  <Text style={styles.stackedLabel}>Total Lent</Text>
                  <Text style={styles.stackedVal}>{preferences.currency}{gaveSum.toLocaleString()}</Text>
                </View>

                {/* Right Stacked Column (Settled/Received) */}
                <View style={styles.stackedColumn}>
                  <View style={styles.stackedBarFrame}>
                    <View style={[styles.stackedPart, { height: `${settledHeight}%`, backgroundColor: '#1A1A2E' }]} />
                    <View style={[styles.stackedEmpty, { height: `${100 - settledHeight}%` }]} />
                  </View>
                  <Text style={styles.stackedLabel}>Settled</Text>
                  <Text style={styles.stackedVal}>{preferences.currency}{receivedSum.toLocaleString()}</Text>
                </View>
              </View>

              <View style={styles.stackedInfo}>
                <Text style={styles.stackedInfoTitle}>Lending Volume Analysis</Text>
                <Text style={styles.stackedInfoDesc}>
                  Your outstanding active loans stand at <Text style={{ color: '#F5C518', fontWeight: 'bold' }}>{preferences.currency}{(gaveSum - receivedSum).toLocaleString()}</Text>.
                </Text>
                <View style={styles.bulletRow}>
                  <View style={[styles.bulletDot, { backgroundColor: '#F5C518' }]} />
                  <Text style={styles.bulletText}>Gave Out (Yellow)</Text>
                </View>
                <View style={styles.bulletRow}>
                  <View style={[styles.bulletDot, { backgroundColor: '#1A1A2E' }]} />
                  <Text style={styles.bulletText}>Settled / Inflow (Navy)</Text>
                </View>
              </View>
            </View>
          </CyberPanel>

          {/* 3. PENTAGON RADAR SPIDER CHART (雷达图) */}
          <CyberPanel title="雷达图 — Lending Categories">
            <View style={styles.radarLayout}>
              <View style={styles.radarGraphic}>
                <Svg width={150} height={150} viewBox="0 0 150 150">
                  {/* Concentric grid webs */}
                  <Polygon points={drawPentagonGrid(1.0)} fill="none" stroke="#E5E7EB" strokeWidth="1" />
                  <Polygon points={drawPentagonGrid(0.7)} fill="none" stroke="#E5E7EB" strokeWidth="0.8" />
                  <Polygon points={drawPentagonGrid(0.4)} fill="none" stroke="#E5E7EB" strokeWidth="0.5" />

                  {/* Web spider lines */}
                  {categories.map((_, i) => {
                    const angle = i * (2 * Math.PI / 5) - Math.PI / 2;
                    const x = radarCenter + radarRadius * Math.cos(angle);
                    const y = radarCenter + radarRadius * Math.sin(angle);
                    return (
                      <Line key={i} x1={radarCenter} y1={radarCenter} x2={x} y2={y} stroke="#E5E7EB" strokeWidth="1" />
                    );
                  })}

                  {/* Shaded radar area */}
                  {radarPolygonPath !== '' && (
                    <Polygon
                      points={radarPolygonPath}
                      fill="rgba(245, 197, 24, 0.2)"
                      stroke="#F5C518"
                      strokeWidth="2"
                    />
                  )}

                  {/* radar nodes */}
                  {radarPoints.map((pt, i) => (
                    <Circle key={i} cx={pt.x} cy={pt.y} r="3" fill="#FFFFFF" stroke="#F5C518" strokeWidth="1.5" />
                  ))}
                </Svg>
              </View>

              <View style={styles.radarLegend}>
                {categories.map((cat, i) => (
                  <View key={i} style={styles.radarLegendRow}>
                    <View style={[styles.legendDot, { backgroundColor: categoryColors[i] }]} />
                    <Text style={styles.radarLegendLabel}>{cat}:</Text>
                    <Text style={styles.radarLegendVal}>{preferences.currency}{categoryTotals[cat].toLocaleString()}</Text>
                  </View>
                ))}
              </View>
            </View>
          </CyberPanel>

          {/* Donut Card Distribution */}
          <CyberPanel title="饼图 — Lending Distribution">
            <View style={styles.donutOverview}>
              <View style={styles.donutContainer}>
                <Svg width={110} height={110} viewBox="0 0 120 120">
                  {totalSpent === 0 ? (
                    <Circle cx="60" cy="60" r="45" stroke="#E5E7EB" strokeWidth="14" fill="transparent" />
                  ) : (
                    donutSlices.map((slice, i) => (
                      <Circle
                        key={i}
                        cx="60"
                        cy="60"
                        r="45"
                        stroke={slice.color}
                        strokeWidth="14"
                        strokeDasharray={slice.dasharray}
                        fill="transparent"
                        rotation={slice.rotation}
                        origin="60, 60"
                      />
                    ))
                  )}
                </Svg>
                <View style={styles.donutCenter}>
                  <Text style={styles.donutAmount}>
                    {preferences.currency}{totalSpent.toLocaleString()}
                  </Text>
                  <Text style={styles.donutLabel}>Total lent</Text>
                </View>
              </View>

              <View style={styles.legendContainer}>
                {donutSlices.map((slice, i) => (
                  <View key={i} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                    <View style={styles.legendText}>
                      <Text style={styles.legendLabel}>{slice.label}</Text>
                      <Text style={styles.legendPercent}>{slice.percent}%</Text>
                    </View>
                    <Text style={styles.legendAmount}>
                      {preferences.currency}{slice.amount.toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </CyberPanel>
        </>
      ) : (
        <>
          {/* PERSONAL FINANCE TRACK */}
          {/* 1. COMBINED BAR & LINE CASH FLOW CHART ("柱折图") */}
          <CyberPanel title="柱折图 — Cash Flow Combined Grid">
            <View style={styles.chartWrapper}>
              <View style={styles.chartWithYAxis}>
                <View style={styles.yAxisLabels}>
                  <Text style={styles.yAxisText}>{preferences.currency}{Math.round(combinedMax)}</Text>
                  <Text style={styles.yAxisText}>{preferences.currency}{Math.round(combinedMax * 0.5)}</Text>
                  <Text style={styles.yAxisText}>{preferences.currency}0</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Svg width="100%" height={150} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                    {/* Background grid */}
                    <Path d={`M0,20 L${svgWidth},20`} stroke="#F0F0F0" strokeWidth="1" strokeDasharray="3,3" />
                    <Path d={`M0,75 L${svgWidth},75`} stroke="#F0F0F0" strokeWidth="1" strokeDasharray="3,3" />
                    <Path d={`M0,130 L${svgWidth},130`} stroke="#E5E7EB" strokeWidth="1" />

                    {/* Bars representing Income */}
                    {monthlyBarData.map((d, idx) => {
                      const stepX = (svgWidth - 40) / 5;
                      const baseX = 20 + idx * stepX;
                      const barW = 10;
                      const barH = (d.income / combinedMax) * 110;

                      return (
                        <Rect
                          key={idx}
                          x={baseX}
                          y={130 - barH}
                          width={barW}
                          height={Math.max(2, barH)}
                          fill="#FDE047"
                          rx="2"
                        />
                      );
                    })}

                    {/* Expenses line chart running over the bars */}
                    {combinedLinePath !== '' && (
                      <Path d={combinedLinePath} fill="none" stroke="#1A1A2E" strokeWidth="2.5" />
                    )}

                    {/* Expenses line node points */}
                    {combinedLinePoints.map((pt, idx) => (
                      <Circle key={idx} cx={pt.x} cy={pt.y} r="3.5" fill="#FFFFFF" stroke="#1A1A2E" strokeWidth="2" />
                    ))}
                  </Svg>
                </View>
              </View>

              <View style={styles.chartXAxis}>
                {monthlyBarData.map((c) => (
                  <Text key={c.label} style={styles.xAxisText}>{c.label}</Text>
                ))}
              </View>

              {/* Combined Legend */}
              <View style={styles.combinedLegend}>
                <View style={styles.bulletRow}>
                  <View style={[styles.bulletDot, { backgroundColor: '#FDE047' }]} />
                  <Text style={styles.bulletText}>Income Inflow (Yellow bars)</Text>
                </View>
                <View style={styles.bulletRow}>
                  <View style={[styles.bulletDot, { backgroundColor: '#1A1A2E' }]} />
                  <Text style={styles.bulletText}>Expense Outflow (Navy line)</Text>
                </View>
              </View>
            </View>
          </CyberPanel>

          {/* 2. TRANSACTION SCATTER BUBBLE CHART ("散点图") */}
          <CyberPanel title="散点图 — Transaction Bubbles Desk">
            <View style={styles.chartWrapper}>
              <View style={styles.chartWithYAxis}>
                <View style={styles.yAxisLabels}>
                  <Text style={styles.yAxisText}>{preferences.currency}{Math.round(maxScatterAmount)}</Text>
                  <Text style={styles.yAxisText}>{preferences.currency}{Math.round(maxScatterAmount * 0.5)}</Text>
                  <Text style={styles.yAxisText}>{preferences.currency}0</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Svg width="100%" height={150} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                    <Path d={`M0,20 L${svgWidth},20`} stroke="#F0F0F0" strokeWidth="1" strokeDasharray="3,3" />
                    <Path d={`M0,75 L${svgWidth},75`} stroke="#F0F0F0" strokeWidth="1" strokeDasharray="3,3" />
                    <Path d={`M0,130 L${svgWidth},130`} stroke="#E5E7EB" strokeWidth="1" />

                    {scatterTransactions.map((tx, idx) => {
                      const stepX = (svgWidth - 40) / Math.max(1, scatterTransactions.length - 1);
                      const cx = 20 + idx * stepX;
                      const cy = 130 - (tx.amount / maxScatterAmount) * 100;
                      // Radius maps to transaction size relative to total amount
                      const radius = Math.max(6, Math.min(18, (tx.amount / maxScatterAmount) * 20));

                      return (
                        <G key={idx}>
                          <Circle
                            cx={cx}
                            cy={cy}
                            r={radius}
                            fill="rgba(245, 197, 24, 0.3)"
                            stroke="#F5C518"
                            strokeWidth="1.5"
                          />
                          <Circle
                            cx={cx}
                            cy={cy}
                            r="3"
                            fill="#1A1A2E"
                          />
                        </G>
                      );
                    })}
                  </Svg>
                </View>
              </View>

              <View style={styles.chartXAxis}>
                {scatterTransactions.map((tx, idx) => {
                  const dateObj = parseDateString(tx.date);
                  return (
                    <Text key={idx} style={[styles.xAxisText, { fontSize: 8 }]}>
                      {dateObj.getDate()}th
                    </Text>
                  );
                })}
              </View>

              <Text style={styles.scatterDesc}>
                💡 Bubble radius corresponds to transaction sizes. Larger bubbles indicate high-volume cash transactions.
              </Text>
            </View>
          </CyberPanel>

          {/* 3. JAPANESE CANDLESTICK CHART */}
          <CyberPanel title="日本蜡烛图 — Japanese Candlestick Trend">
            <View style={styles.chartWrapper}>
              <View style={styles.chartWithYAxis}>
                <View style={styles.yAxisLabels}>
                  <Text style={styles.yAxisText}>{preferences.currency}{Math.round(maxCandleVal)}</Text>
                  <Text style={styles.yAxisText}>{preferences.currency}{Math.round(maxCandleVal * 0.5)}</Text>
                  <Text style={styles.yAxisText}>{preferences.currency}0</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Svg width="100%" height={150} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                    <Path d={`M0,20 L${svgWidth},20`} stroke="#F0F0F0" strokeWidth="1" strokeDasharray="3,3" />
                    <Path d={`M0,75 L${svgWidth},75`} stroke="#F0F0F0" strokeWidth="1" strokeDasharray="3,3" />
                    <Path d={`M0,130 L${svgWidth},130`} stroke="#E5E7EB" strokeWidth="1" />

                    {candlestickData.map((c, idx) => {
                      const stepX = (svgWidth - 20) / 6;
                      const baseX = 20 + idx * stepX;
                      const candleW = 12;

                      const openY = 130 - (c.open / maxCandleVal) * 100;
                      const closeY = 130 - (c.close / maxCandleVal) * 100;
                      const highY = 130 - (c.high / maxCandleVal) * 100;
                      const lowY = 130 - (c.low / maxCandleVal) * 100;

                      const isBullish = c.close >= c.open;
                      const candleColor = isBullish ? '#34D399' : '#F87171';

                      return (
                        <React.Fragment key={idx}>
                          {/* Wick Line */}
                          <Line
                            x1={baseX + candleW / 2}
                            y1={highY}
                            x2={baseX + candleW / 2}
                            y2={lowY}
                            stroke={candleColor}
                            strokeWidth="1.5"
                          />
                          {/* Candle Solid Body */}
                          <Rect
                            x={baseX}
                            y={Math.min(openY, closeY)}
                            width={candleW}
                            height={Math.max(4, Math.abs(openY - closeY))}
                            fill={candleColor}
                            rx="1.5"
                          />
                        </React.Fragment>
                      );
                    })}
                  </Svg>
                </View>
              </View>

              <View style={styles.chartXAxis}>
                {candlestickData.map((c) => (
                  <Text key={c.label} style={styles.xAxisText}>{c.label}</Text>
                ))}
              </View>
            </View>
          </CyberPanel>

          {/* 4. SEGMENTED CIRCULAR GAUGE SPEEDOMETER (仪表盘) */}
          <CyberPanel title="仪表盘 — Savings Ring Speedometer">
            <View style={styles.gaugeContainer}>
              <View style={styles.gaugeGraphic}>
                <Svg width={110} height={110} viewBox="0 0 100 100">
                  {/* Outer Speedometer ticks ring */}
                  <Circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="transparent"
                    stroke="#E5E7EB"
                    strokeWidth="4"
                    strokeDasharray="2, 6"
                  />
                  {/* Gauge active progress circle */}
                  <Circle
                    cx="50"
                    cy="50"
                    r="34"
                    fill="transparent"
                    stroke="#E5E7EB"
                    strokeWidth="8"
                  />
                  <Circle
                    cx="50"
                    cy="50"
                    r="34"
                    fill="transparent"
                    stroke="#F5C518"
                    strokeWidth="8"
                    strokeDasharray={`${(goalProgress / 100) * 213.6} 213.6`}
                    rotation="-90"
                    origin="50, 50"
                    strokeLinecap="round"
                  />
                </Svg>
                <View style={styles.gaugeCenter}>
                  <Text style={styles.gaugePercent}>{goalProgress}%</Text>
                  <Text style={styles.gaugeLabel}>Savings Rate</Text>
                </View>
              </View>

              <View style={styles.gaugeLegend}>
                <Text style={styles.gaugeTitle}>Efficiency Score</Text>
                <Text style={[styles.gaugeStatus, { color: healthScore.color }]}>{healthScore.badge}</Text>
                <Text style={styles.gaugeDesc}>{healthScore.desc}</Text>
                <Text style={styles.gaugeGoalSub}>
                  Saved: {preferences.currency}{totalPersonalSavings.toLocaleString()} / {preferences.currency}{targetGoal.toLocaleString()}
                </Text>
              </View>
            </View>
          </CyberPanel>

          {/* 5. CATEGORY LEAKAGE WATERFALL PROGRESS PANEL (横向柱状图) */}
          <CyberPanel title="横向柱状图 — Category Leakage share">
            <View style={styles.waterfallWrapper}>
              <Text style={styles.waterfallTitle}>Percentage Leaked Share</Text>
              <View style={styles.waterfallBar}>
                {personalDonutSlices.filter(s => s.amount > 0).map((slice, i) => (
                  <View
                    key={i}
                    style={{
                      flex: slice.percent,
                      backgroundColor: slice.color,
                      height: 12,
                    }}
                  />
                ))}
                {totalPersonalSpent === 0 && (
                  <View style={{ flex: 1, backgroundColor: '#E5E7EB', height: 12 }} />
                )}
              </View>

              <View style={styles.waterfallLegendRow}>
                {personalDonutSlices.filter(s => s.amount > 0).map((slice, i) => (
                  <View key={i} style={styles.waterfallLegendItem}>
                    <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                    <Text style={styles.waterfallLabel}>
                      {slice.label} ({slice.percent}%)
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </CyberPanel>

          {/* Category Donut Distribution */}
          <CyberPanel title="饼图 — Outflow Category Breakdown">
            <View style={styles.donutOverview}>
              <View style={styles.donutContainer}>
                <Svg width={110} height={110} viewBox="0 0 120 120">
                  {totalPersonalSpent === 0 ? (
                    <Circle cx="60" cy="60" r="45" stroke="#E5E7EB" strokeWidth="14" fill="transparent" />
                  ) : (
                    personalDonutSlices.map((slice, i) => (
                      <Circle
                        key={i}
                        cx="60"
                        cy="60"
                        r="45"
                        stroke={slice.color}
                        strokeWidth="14"
                        strokeDasharray={slice.dasharray}
                        fill="transparent"
                        rotation={slice.rotation}
                        origin="60, 60"
                      />
                    ))
                  )}
                </Svg>
                <View style={styles.donutCenter}>
                  <Text style={styles.donutAmount}>
                    {preferences.currency}{totalPersonalSpent.toLocaleString()}
                  </Text>
                  <Text style={styles.donutLabel}>Spent</Text>
                </View>
              </View>

              <View style={styles.legendContainer}>
                {personalDonutSlices.filter(s => s.amount > 0).map((slice, i) => (
                  <View key={i} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                    <View style={styles.legendText}>
                      <Text style={styles.legendLabel}>{slice.label}</Text>
                      <Text style={styles.legendPercent}>{slice.percent}%</Text>
                    </View>
                    <Text style={styles.legendAmount}>
                      {preferences.currency}{slice.amount.toLocaleString()}
                    </Text>
                  </View>
                ))}
                {totalPersonalSpent === 0 && (
                  <Text style={{ fontSize: 12, color: '#6B7280' }}>No personal expenses logged yet.</Text>
                )}
              </View>
            </View>
          </CyberPanel>
        </>
      )}

      {/* Quick Cash Flow Intelligence Cards */}
      <Text style={styles.deckTitle}>Audit Intelligence Cards</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.insightsRow}>
        <View style={styles.cyberInsightCard}>
          <View style={[styles.insightIcon, { backgroundColor: 'rgba(245, 197, 24, 0.1)' }]}>
            <Icon name={track === 'friends' ? "star" : "trending-down"} size={18} color="#F5C518" />
          </View>
          <Text style={styles.insightValue}>
            {preferences.currency}
            {track === 'friends' ? savedThisMonth.toLocaleString() : dailySpendRate.toLocaleString()}
          </Text>
          <Text style={styles.insightLabel}>
            {track === 'friends' ? 'Lending Balance' : 'Daily Spend Rate'}
          </Text>
        </View>

        <View style={styles.cyberInsightCard}>
          <View style={[styles.insightIcon, { backgroundColor: 'rgba(26, 26, 46, 0.05)' }]}>
            <Icon name={track === 'friends' ? "wallet" : "cart-outline"} size={18} color="#1A1A2E" />
          </View>
          <Text style={styles.insightValue}>
            {preferences.currency}
            {track === 'friends' ? avgLendingSize.toLocaleString() : (largestTx ? largestTx.amount.toLocaleString() : 0)}
          </Text>
          <Text style={styles.insightLabel}>
            {track === 'friends' ? 'Avg Lending Size' : `Peak: ${largestTx ? largestTx.title : 'N/A'}`}
          </Text>
        </View>

        <View style={styles.cyberInsightCard}>
          <View style={[styles.insightIcon, { backgroundColor: 'rgba(52, 211, 153, 0.1)' }]}>
            <Icon name={track === 'friends' ? "person" : "stats-chart"} size={18} color="#34D399" />
          </View>
          <Text style={styles.insightValue} numberOfLines={1}>
            {track === 'friends' ? highestDebtorName : `${preferences.currency}${totalPersonalSavings.toLocaleString()}`}
          </Text>
          <Text style={styles.insightLabel}>
            {track === 'friends' ? `Top Debtor (${preferences.currency}${highestDebtorAmt})` : 'Net Inflow'}
          </Text>
        </View>
      </ScrollView>

      {/* EXPORT OPTIONS SECTION */}
      <Text style={styles.deckTitle}>Audit Ledgers & Export Desk</Text>
      <View style={styles.exportContainer}>
        <TouchableOpacity style={styles.cyberExportBtnExcel} onPress={handleExportCSV}>
          <Icon name="document-text-outline" size={18} color="#2E7D32" />
          <Text style={styles.cyberExportBtnTextExcel}>Export Excel (XLSX)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cyberExportBtnPDF} onPress={handleExportPDF}>
          <Icon name="receipt-outline" size={18} color="#C62828" />
          <Text style={styles.cyberExportBtnTextPDF}>Export PDF Statement</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL: Calendar Date Range Selector */}
      <Modal visible={rangeModalVisible} animationType="slide" transparent>
        <View style={styles.modalRoot}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Custom Date Range</Text>
              <TouchableOpacity onPress={() => setRangeModalVisible(false)}>
                <Icon name="close" size={24} color="#1A1A2E" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 16, marginBottom: 24 }}>
              <Text style={styles.modalSub}>Pick start and end dates to filter all charts & ledgers:</Text>

              <View style={styles.rangeRow}>
                <TouchableOpacity style={styles.pickerTrigger} onPress={() => setShowStartPicker(true)}>
                  <Text style={styles.pickerLabel}>Start Date</Text>
                  <Text style={styles.pickerVal}>{startDate.toLocaleDateString()}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.pickerTrigger} onPress={() => setShowEndPicker(true)}>
                  <Text style={styles.pickerLabel}>End Date</Text>
                  <Text style={styles.pickerVal}>{endDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* DateTime Pickers */}
            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selected) => {
                  setShowStartPicker(false);
                  if (selected) setStartDate(selected);
                }}
              />
            )}

            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selected) => {
                  setShowEndPicker(false);
                  if (selected) setEndDate(selected);
                }}
              />
            )}

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={[styles.rangeActionBtn, { backgroundColor: '#F3F4F6', flex: 1 }]}
                onPress={() => {
                  setIsCustomRange(false);
                  setRangeModalVisible(false);
                }}
              >
                <Text style={[styles.rangeActionText, { color: '#5C6270' }]}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.rangeActionBtn, { backgroundColor: COLORS.primary, flex: 2 }]}
                onPress={() => {
                  if (startDate > endDate) {
                    Alert.alert('Invalid Range', 'Start date cannot be after end date.');
                    return;
                  }
                  setIsCustomRange(true);
                  setRangeModalVisible(false);
                }}
              >
                <Text style={[styles.rangeActionText, { color: COLORS.secondary }]}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF4', // Beautiful warm sand white background matching ZOVIO core theme
    padding: 20,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  calendarBtn: {
    backgroundColor: '#FFFFFF',
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F5C518',
    shadowColor: '#F5C518',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  customRangeIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEFCE8',
    borderWidth: 1.5,
    borderColor: '#F5C518',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  customRangeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
  trackSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 4,
    marginBottom: 20,
    gap: 4,
    borderWidth: 1.5,
    borderColor: '#F5C518',
  },
  trackBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  trackBtnActive: {
    backgroundColor: '#F5C518', // Primary yellow
  },
  trackBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  trackBtnTextActive: {
    color: '#1A1A2E',
    fontWeight: '800',
  },
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#F5C518',
  },
  segmentActive: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  segmentInactive: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  segmentText: {
    color: '#1A1A2E',
    fontWeight: '700',
  },
  cyberCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F5C518',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    position: 'relative',
    shadowColor: '#F5C518',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  // Bounding Corner Box Framing (Sci-Fi control interface matching reference in Yellow Theme)
  corner: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderColor: '#F5C518',
  },
  cornerTL: {
    top: -1.5,
    left: -1.5,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  cornerTR: {
    top: -1.5,
    right: -1.5,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  cornerBL: {
    bottom: -1.5,
    left: -1.5,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  cornerBR: {
    bottom: -1.5,
    right: -1.5,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chartWrapper: {
    marginBottom: 8,
  },
  chartWithYAxis: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yAxisLabels: {
    width: 45,
    height: 150,
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  yAxisText: {
    fontSize: 9,
    color: '#5C6270',
    textAlign: 'right',
    paddingRight: 8,
    fontWeight: '700',
  },
  chartXAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingLeft: 45,
    paddingRight: 10,
  },
  xAxisText: {
    fontSize: 9,
    color: '#5C6270',
    fontWeight: '700',
  },
  // Stacked Bar Layout
  stackedLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  stackedBarContainer: {
    flexDirection: 'row',
    gap: 24,
    paddingHorizontal: 8,
  },
  stackedColumn: {
    alignItems: 'center',
  },
  stackedBarFrame: {
    width: 28,
    height: 100,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    overflow: 'hidden',
    flexDirection: 'column-reverse',
  },
  stackedPart: {
    width: '100%',
    borderRadius: 4,
  },
  stackedEmpty: {
    width: '100%',
  },
  stackedLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5C6270',
    marginTop: 8,
  },
  stackedVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A1A2E',
    marginTop: 2,
  },
  stackedInfo: {
    flex: 1,
    marginLeft: 20,
    gap: 6,
  },
  stackedInfoTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  stackedInfoDesc: {
    fontSize: 9,
    color: '#5C6270',
    lineHeight: 13,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bulletText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#5C6270',
  },
  // Radar Layout
  radarLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  radarGraphic: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarLegend: {
    flex: 1,
    marginLeft: 16,
    gap: 8,
  },
  radarLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radarLegendLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5C6270',
    flex: 1,
  },
  radarLegendVal: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  donutOverview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  donutContainer: {
    width: 110,
    height: 110,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  donutAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  donutLabel: {
    fontSize: 8,
    color: '#5C6270',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  legendContainer: {
    flex: 1,
    marginLeft: 20,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  legendText: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5C6270',
  },
  legendPercent: {
    fontSize: 9,
    color: '#8E9AA8',
    marginTop: 1,
  },
  legendAmount: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  // Combined Legend & Scatter
  combinedLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
  },
  scatterDesc: {
    fontSize: 9,
    color: '#5C6270',
    fontWeight: '600',
    lineHeight: 13,
    marginTop: 12,
    textAlign: 'center',
  },
  deckTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A2E',
    marginTop: 12,
    marginBottom: 16,
  },
  insightsRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  cyberInsightCard: {
    width: 130,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#F5C518',
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#F5C518',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  insightLabel: {
    fontSize: 10,
    color: '#5C6270',
    fontWeight: '600',
  },
  gaugeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gaugeGraphic: {
    position: 'relative',
    width: 110,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gaugeCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  gaugePercent: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  gaugeLabel: {
    fontSize: 8,
    color: '#5C6270',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  gaugeLegend: {
    flex: 1,
    marginLeft: 20,
  },
  gaugeTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5C6270',
  },
  gaugeStatus: {
    fontSize: 14,
    fontWeight: '800',
    marginVertical: 4,
  },
  gaugeDesc: {
    fontSize: 9,
    color: '#8E9AA8',
    lineHeight: 12,
  },
  gaugeGoalSub: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
    marginTop: 8,
  },
  waterfallWrapper: {
    paddingVertical: 4,
  },
  waterfallTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5C6270',
    marginBottom: 10,
  },
  waterfallBar: {
    flexDirection: 'row',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#F3F4F6',
  },
  waterfallLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  waterfallLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waterfallLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5C6270',
  },
  exportContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
  },
  cyberExportBtnExcel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: '#E8F5E9',
    borderColor: '#81C784',
  },
  cyberExportBtnPDF: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: '#FFEBEE',
    borderColor: '#E57373',
  },
  cyberExportBtnTextExcel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2E7D32',
  },
  cyberExportBtnTextPDF: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C62828',
  },
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(11, 19, 43, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1.5,
    borderColor: '#F5C518',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  modalSub: {
    fontSize: 11,
    color: '#5C6270',
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  pickerTrigger: {
    flex: 1,
    backgroundColor: '#FFFDF4',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#F5C518',
  },
  pickerLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#5C6270',
  },
  pickerVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A1A2E',
    marginTop: 4,
  },
  rangeActionBtn: {
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  rangeActionText: {
    fontWeight: '800',
    fontSize: 14,
  },
});
