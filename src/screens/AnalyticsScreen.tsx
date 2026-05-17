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
import Svg, { Circle, Path, Rect, Line, Polygon, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
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
  // FRIENDS & FAMILY SPECS & CALCULATIONS
  // ==========================================
  const categories = ['Food & Dining', 'Petrol', 'Transport', 'Shopping', 'Others'];
  const categoryColors = ['#F5C518', '#34D399', '#EF4444', '#60A5FA', '#A78BFA'];

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

  // Node highlight logic matching the circular pulsating selected node callout (30 node design in image)
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
  // PERSONAL FINANCE SPECS & CALCULATIONS
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
  const expenseColors = ['#F87171', '#F5C518', '#60A5FA', '#34D399', '#A78BFA', '#F472B6', '#9CA3AF'];

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
    if (savingsRate > 35) return { badge: 'High Asset Build 🌟', desc: 'Fantastic cash utilization rate!', color: '#34D399' };
    if (savingsRate > 15) return { badge: 'Balanced Growth 👍', desc: 'Secure reserves accumulated.', color: '#60A5FA' };
    if (savingsRate >= 0) return { badge: 'Tight Position ⚠️', desc: 'Drains match total cash inflow.', color: '#F5C518' };
    return { badge: 'Capital Deficit 🚨', desc: 'Cash outflows exceed monthly income.', color: '#F87171' };
  };
  const healthScore = getEfficiencyScore();

  // ==========================================
  // NEW HIGH-TECH INTERACTIVE JAPANESE CANDLESTICK BUILDER
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
  // HIGH-TECH RADAR SPIDER GRAPH MILESTONE
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

  // Pentagon Grid Mesh helper
  const drawPentagonGrid = (scale: number) => {
    return categories.map((_, i) => {
      const angle = i * (2 * Math.PI / 5) - Math.PI / 2;
      const x = radarCenter + (radarRadius * scale) * Math.cos(angle);
      const y = radarCenter + (radarRadius * scale) * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
  };

  // Speedometer circular gauge milestone
  const targetGoal = 25000;
  const goalProgress = Math.min(100, Math.max(0, Math.round((totalPersonalSavings / targetGoal) * 100)));

  // Cyber Panel Card wrapping element to display corners perfectly
  const CyberPanel = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.cyberCard}>
      {/* Absolute Corner Anchors */}
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
        <Text style={styles.title}>Audit & Insights</Text>
        <TouchableOpacity style={styles.calendarBtn} onPress={() => setRangeModalVisible(true)}>
          <Icon
            name="calendar-outline"
            size={20}
            color={isCustomRange ? COLORS.primary : '#FFFFFF'}
          />
        </TouchableOpacity>
      </View>

      {/* Date Range Badge indicator */}
      {isCustomRange && (
        <View style={styles.customRangeIndicator}>
          <Text style={styles.customRangeText}>
            📅 {startDate.toLocaleDateString()} — {endDate.toLocaleDateString()}
          </Text>
          <TouchableOpacity onPress={() => setIsCustomRange(false)}>
            <Icon name="close-circle" size={18} color="#F87171" />
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
            Family Lending Ledger
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.trackBtn, track === 'personal' && styles.trackBtnActive]}
          onPress={() => setTrack('personal')}
        >
          <Text style={[styles.trackBtnText, track === 'personal' && styles.trackBtnTextActive]}>
            Personal Finance Desk
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
                      <LinearGradient id="glowingArea" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="#A78BFA" stopOpacity="0.4" />
                        <Stop offset="100%" stopColor="#A78BFA" stopOpacity="0.0" />
                      </LinearGradient>
                    </Defs>
                    {/* Grid Background Lines */}
                    <Path d={`M0,20 L${svgWidth},20`} stroke="#1F1F35" strokeWidth="1" strokeDasharray="3,3" />
                    <Path d={`M0,65 L${svgWidth},65`} stroke="#1F1F35" strokeWidth="1" strokeDasharray="3,3" />
                    <Path d={`M0,110 L${svgWidth},110`} stroke="#1F1F35" strokeWidth="1" strokeDasharray="3,3" />
                    <Path d={`M0,130 L${svgWidth},130`} stroke="#1F1F35" strokeWidth="1" />

                    {/* Area path with glowing gradient */}
                    {areaPath !== '' && <Path d={areaPath} fill="url(#glowingArea)" />}

                    {/* Smooth Neon line */}
                    {linePath !== '' && <Path d={linePath} fill="none" stroke="#A78BFA" strokeWidth="2.5" />}

                    {/* Node Selector Highlight Halo Rings (Exactly like the "glowing 30 node" in reference) */}
                    {selectedNode && (
                      <>
                        <Circle cx={selectedNode.x} cy={selectedNode.y} r="10" fill="rgba(167, 139, 250, 0.25)" />
                        <Circle cx={selectedNode.x} cy={selectedNode.y} r="6" fill="rgba(167, 139, 250, 0.5)" />
                        <Circle cx={selectedNode.x} cy={selectedNode.y} r="3" fill="#FFFFFF" />
                        {/* Callout floating box */}
                        <Rect
                          x={selectedNode.x - 22}
                          y={selectedNode.y - 28}
                          width="44"
                          height="18"
                          rx="4"
                          fill="#1A1A2E"
                          stroke="#A78BFA"
                          strokeWidth="1"
                        />
                        <SvgText
                          x={selectedNode.x}
                          y={selectedNode.y - 15}
                          fill="#A78BFA"
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

          {/* 2. HIGH-TECH RADAR SPIDER CHART (雷达图) */}
          <CyberPanel title="雷达图 — Categories Analysis">
            <View style={styles.radarLayout}>
              <View style={styles.radarGraphic}>
                <Svg width={150} height={150} viewBox="0 0 150 150">
                  {/* Outer & Inner Pentagonal Grid Lines */}
                  <Polygon points={drawPentagonGrid(1.0)} fill="none" stroke="#1F1F35" strokeWidth="1" />
                  <Polygon points={drawPentagonGrid(0.7)} fill="none" stroke="#1F1F35" strokeWidth="0.8" />
                  <Polygon points={drawPentagonGrid(0.4)} fill="none" stroke="#1F1F35" strokeWidth="0.5" />

                  {/* Pentagonal Axes Web lines */}
                  {categories.map((_, i) => {
                    const angle = i * (2 * Math.PI / 5) - Math.PI / 2;
                    const x = radarCenter + radarRadius * Math.cos(angle);
                    const y = radarCenter + radarRadius * Math.sin(angle);
                    return (
                      <Line key={i} x1={radarCenter} y1={radarCenter} x2={x} y2={y} stroke="#1F1F35" strokeWidth="1" />
                    );
                  })}

                  {/* Filled Semi-transparent Web Polygon */}
                  {radarPolygonPath !== '' && (
                    <Polygon
                      points={radarPolygonPath}
                      fill="rgba(167, 139, 250, 0.2)"
                      stroke="#A78BFA"
                      strokeWidth="1.5"
                    />
                  )}

                  {/* Node circular dots */}
                  {radarPoints.map((pt, i) => (
                    <Circle key={i} cx={pt.x} cy={pt.y} r="2.5" fill="#FFFFFF" stroke="#A78BFA" strokeWidth="1" />
                  ))}
                </Svg>
              </View>

              {/* Labels list */}
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
                    <Circle cx="60" cy="60" r="45" stroke="#1F1F35" strokeWidth="14" fill="transparent" />
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
                  <Text style={styles.donutLabel}>Total spent</Text>
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

          {/* Quick Insights deck */}
          <Text style={styles.deckTitle}>Audit Intelligence Cards</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.insightsRow}>
            <View style={styles.cyberInsightCard}>
              <View style={[styles.insightIcon, { backgroundColor: 'rgba(245, 197, 24, 0.1)' }]}>
                <Icon name="star" size={18} color="#F5C518" />
              </View>
              <Text style={styles.insightValue}>
                {preferences.currency}{savedThisMonth.toLocaleString()}
              </Text>
              <Text style={styles.insightLabel}>Lending Balance</Text>
            </View>

            <View style={styles.cyberInsightCard}>
              <View style={[styles.insightIcon, { backgroundColor: 'rgba(167, 139, 250, 0.1)' }]}>
                <Icon name="wallet" size={18} color="#A78BFA" />
              </View>
              <Text style={styles.insightValue}>
                {preferences.currency}{avgLendingSize.toLocaleString()}
              </Text>
              <Text style={styles.insightLabel}>Avg Lending Size</Text>
            </View>

            <View style={styles.cyberInsightCard}>
              <View style={[styles.insightIcon, { backgroundColor: 'rgba(96, 165, 250, 0.1)' }]}>
                <Icon name="person" size={18} color="#60A5FA" />
              </View>
              <Text style={styles.insightValue} numberOfLines={1}>{highestDebtorName}</Text>
              <Text style={styles.insightLabel}>Top Debtor ({preferences.currency}{highestDebtorAmt})</Text>
            </View>
          </ScrollView>
        </>
      ) : (
        <>
          {/* PERSONAL FINANCE TRACK */}
          {/* 1. JAPANESE CANDLESTICK CHART */}
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
                    <Path d={`M0,20 L${svgWidth},20`} stroke="#1F1F35" strokeWidth="1" strokeDasharray="3,3" />
                    <Path d={`M0,75 L${svgWidth},75`} stroke="#1F1F35" strokeWidth="1" strokeDasharray="3,3" />
                    <Path d={`M0,130 L${svgWidth},130`} stroke="#1F1F35" strokeWidth="1" />

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

          {/* 2. SEGMENTED CIRCULAR GAUGE SPEEDOMETER (仪表盘) */}
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
                    stroke="#1F1F35"
                    strokeWidth="4"
                    strokeDasharray="2, 6"
                  />
                  {/* Gauge active progress circle */}
                  <Circle
                    cx="50"
                    cy="50"
                    r="34"
                    fill="transparent"
                    stroke="#1F1F35"
                    strokeWidth="8"
                  />
                  <Circle
                    cx="50"
                    cy="50"
                    r="34"
                    fill="transparent"
                    stroke="#A78BFA"
                    strokeWidth="8"
                    strokeDasharray={`${(goalProgress / 100) * 213.6} 213.6`}
                    rotation="-90"
                    origin="50, 50"
                    strokeLinecap="round"
                  />
                </Svg>
                <View style={styles.gaugeCenter}>
                  <Text style={styles.gaugePercent}>{goalProgress}%</Text>
                  <Text style={styles.gaugeLabel}>Efficiency</Text>
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

          {/* 3. CATEGORY LEAKAGE WATERFALL PROGRESS PANEL (横向柱状图) */}
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
                  <View style={{ flex: 1, backgroundColor: '#1F1F35', height: 12 }} />
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
          <CyberPanel title="饼图 — Personal Outflows Share">
            <View style={styles.donutOverview}>
              <View style={styles.donutContainer}>
                <Svg width={110} height={110} viewBox="0 0 120 120">
                  {totalPersonalSpent === 0 ? (
                    <Circle cx="60" cy="60" r="45" stroke="#1F1F35" strokeWidth="14" fill="transparent" />
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

          {/* Deep Cash flow metrics */}
          <Text style={styles.deckTitle}>Audit Intelligence Cards</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.insightsRow}>
            <View style={styles.cyberInsightCard}>
              <View style={[styles.insightIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <Icon name="trending-down" size={18} color="#EF4444" />
              </View>
              <Text style={styles.insightValue}>
                {preferences.currency}{dailySpendRate.toLocaleString()}
              </Text>
              <Text style={styles.insightLabel}>Daily Spend Rate</Text>
            </View>

            <View style={styles.cyberInsightCard}>
              <View style={[styles.insightIcon, { backgroundColor: 'rgba(245, 197, 24, 0.1)' }]}>
                <Icon name="cart-outline" size={18} color="#F5C518" />
              </View>
              <Text style={styles.insightValue}>
                {preferences.currency}{largestTx ? largestTx.amount.toLocaleString() : 0}
              </Text>
              <Text style={styles.insightLabel} numberOfLines={1}>
                Peak: {largestTx ? largestTx.title : 'N/A'}
              </Text>
            </View>

            <View style={styles.cyberInsightCard}>
              <View style={[styles.insightIcon, { backgroundColor: 'rgba(52, 211, 153, 0.1)' }]}>
                <Icon name="stats-chart" size={18} color="#34D399" />
              </View>
              <Text style={styles.insightValue}>
                {preferences.currency}{totalPersonalSavings.toLocaleString()}
              </Text>
              <Text style={styles.insightLabel}>Net Inflow</Text>
            </View>
          </ScrollView>
        </>
      )}

      {/* EXPORT OPTIONS SECTION */}
      <Text style={styles.deckTitle}>Audit Ledgers & Export Desk</Text>
      <View style={styles.exportContainer}>
        <TouchableOpacity style={styles.cyberExportBtnExcel} onPress={handleExportCSV}>
          <Icon name="document-text-outline" size={18} color="#34D399" />
          <Text style={styles.cyberExportBtnTextExcel}>Export Excel (XLSX)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cyberExportBtnPDF} onPress={handleExportPDF}>
          <Icon name="receipt-outline" size={18} color="#F87171" />
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
                <Icon name="close" size={24} color="#FFFFFF" />
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
                style={[styles.rangeActionBtn, { backgroundColor: '#1A1A2E', flex: 1 }]}
                onPress={() => {
                  setIsCustomRange(false);
                  setRangeModalVisible(false);
                }}
              >
                <Text style={[styles.rangeActionText, { color: '#8B949E' }]}>Reset</Text>
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
    backgroundColor: '#0A0A16', // Deep neon black/navy base background matching the theme
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
    color: '#FFFFFF',
  },
  calendarBtn: {
    backgroundColor: '#15152A',
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3B296A',
  },
  customRangeIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#120F24',
    borderWidth: 1,
    borderColor: '#A78BFA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  customRangeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A78BFA',
  },
  trackSelector: {
    flexDirection: 'row',
    backgroundColor: '#121226',
    borderRadius: 24,
    padding: 4,
    marginBottom: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: '#1C1C35',
  },
  trackBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  trackBtnActive: {
    backgroundColor: '#A78BFA', // High-tech active neon tab
  },
  trackBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B949E',
  },
  trackBtnTextActive: {
    color: '#0A0A16',
    fontWeight: '800',
  },
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: '#121226',
    borderRadius: 20,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1C1C35',
  },
  segmentActive: {
    flex: 1,
    backgroundColor: '#F5C518',
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
    color: '#0A0A16',
    fontWeight: '800',
  },
  segmentText: {
    color: '#8B949E',
    fontWeight: '600',
  },
  cyberCard: {
    backgroundColor: '#0E0E1F',
    borderWidth: 1,
    borderColor: '#1F1F3D',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    position: 'relative',
  },
  // Bounding Corner Box Framing (Sci-Fi control interface matching reference image)
  corner: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderColor: '#A78BFA',
  },
  cornerTL: {
    top: -1,
    left: -1,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
  },
  cornerTR: {
    top: -1,
    right: -1,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
  },
  cornerBL: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 1.5,
    borderLeftWidth: 1.5,
  },
  cornerBR: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#A78BFA',
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
    color: '#8B949E',
    textAlign: 'right',
    paddingRight: 8,
    fontWeight: '500',
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
    color: '#8B949E',
    fontWeight: '600',
  },
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
    fontWeight: '600',
    color: '#8B949E',
    flex: 1,
  },
  radarLegendVal: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
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
    color: '#FFFFFF',
  },
  donutLabel: {
    fontSize: 8,
    color: '#8B949E',
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
    fontWeight: '600',
    color: '#8B949E',
  },
  legendPercent: {
    fontSize: 9,
    color: '#5C6270',
    marginTop: 1,
  },
  legendAmount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deckTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
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
    borderWidth: 1,
    borderColor: '#1C1C35',
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#0E0E1F',
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
    color: '#FFFFFF',
    marginBottom: 4,
  },
  insightLabel: {
    fontSize: 10,
    color: '#8B949E',
    fontWeight: '500',
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
    color: '#FFFFFF',
  },
  gaugeLabel: {
    fontSize: 8,
    color: '#8B949E',
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
    color: '#8B949E',
  },
  gaugeStatus: {
    fontSize: 14,
    fontWeight: '800',
    marginVertical: 4,
  },
  gaugeDesc: {
    fontSize: 9,
    color: '#5C6270',
    lineHeight: 12,
  },
  gaugeGoalSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#A78BFA',
    marginTop: 8,
  },
  waterfallWrapper: {
    paddingVertical: 4,
  },
  waterfallTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8B949E',
    marginBottom: 10,
  },
  waterfallBar: {
    flexDirection: 'row',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#15152A',
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
    fontWeight: '600',
    color: '#8B949E',
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
    borderWidth: 1,
    backgroundColor: 'rgba(52, 211, 153, 0.05)',
    borderColor: '#34D399',
  },
  cyberExportBtnPDF: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(248, 113, 113, 0.05)',
    borderColor: '#F87171',
  },
  cyberExportBtnTextExcel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#34D399',
  },
  cyberExportBtnTextPDF: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F87171',
  },
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 22, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0E0E1F',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: '#1F1F3D',
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
    color: '#FFFFFF',
  },
  modalSub: {
    fontSize: 11,
    color: '#8B949E',
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  pickerTrigger: {
    flex: 1,
    backgroundColor: '#15152A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F1F3D',
  },
  pickerLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8B949E',
  },
  pickerVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
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
