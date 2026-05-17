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
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useZovio } from '../store/ZovioContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';

const { width } = Dimensions.get('window');

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
      const recordDate = new Date(m.date);
      if (isNaN(recordDate.getTime())) return true; // fallback

      if (isCustomRange) {
        // Normalize date bounds
        const rDate = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate()).getTime();
        const sDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
        const eDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
        return rDate >= sDate && rDate <= eDate;
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
      const recordDate = new Date(f.date);
      if (isNaN(recordDate.getTime())) return true;

      if (isCustomRange) {
        const rDate = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate()).getTime();
        const sDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
        const eDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
        return rDate >= sDate && rDate <= eDate;
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
      // Build Sheet 1: Friends & Family
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

      // Build Sheet 2: Personal Finances
      const personalData = finances.map((f) => ({
        'Date': f.date,
        'Title / Source': f.title,
        'Type': f.type.toUpperCase(),
        'Amount': f.amount,
        'Category': f.category,
        'Notes': f.notes || '',
      }));

      // Build Multi-sheet workbook using XLSX
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
      
      Alert.alert('Success', 'Excel spreadsheet generated and shared successfully! 📊');
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
  const categoryColors = ['#F5C518', '#3B82F6', '#EF4444', '#10B981', '#9CA3AF'];

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
          const d = new Date(m.date).getDay();
          const targetDay = index === 6 ? 0 : index + 1;
          return d === targetDay;
        });
        return dayRecords.reduce((sum, m) => sum + m.amount, 0);
      });
      return { labels: days, data: totals };
    } else if (timeframe === 'Month') {
      const days = Array.from({ length: 15 }, (_, i) => `${(i + 1) * 2}`);
      const totals = days.map((_, idx) => {
        const startDay = idx * 2;
        const endDay = (idx + 1) * 2;
        const dayRecords = filtered.filter((m) => {
          const dateNum = new Date(m.date).getDate();
          return dateNum >= startDay && dateNum <= endDay;
        });
        return dayRecords.reduce((sum, m) => sum + m.amount, 0);
      });
      return { labels: ['1', '5', '10', '15', '20', '25', '30'], data: totals };
    } else {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const totals = months.map((_, index) => {
        const monthRecords = filtered.filter((m) => new Date(m.date).getMonth() === index);
        return monthRecords.reduce((sum, m) => sum + m.amount, 0);
      });
      return { labels: ['Q1', 'Q2', 'Q3', 'Q4'], data: totals };
    }
  };

  const trend = getTrendData();
  const maxVal = Math.max(...trend.data, 1000);

  const svgWidth = 300;
  const svgHeight = 150;
  const paddingX = 10;
  const paddingY = 20;

  const points = trend.data.map((val, idx) => {
    const x = paddingX + (idx / (trend.data.length - 1)) * (svgWidth - 2 * paddingX);
    const y = svgHeight - paddingY - (val / maxVal) * (svgHeight - 2 * paddingY);
    return { x, y };
  });

  const linePath = points.reduce((path, pt, i) => (i === 0 ? `M${pt.x},${pt.y}` : `${path} L${pt.x},${pt.y}`), '');
  const areaPath = points.length > 0 ? `${linePath} L${points[points.length - 1].x},${svgHeight - paddingY} L${points[0].x},${svgHeight - paddingY} Z` : '';

  // Quick Insights (Friends)
  const receivedSum = filtered.filter((m) => m.type === 'received').reduce((sum, m) => sum + m.amount, 0);
  const gaveSum = filtered.filter((m) => m.type === 'gave').reduce((sum, m) => sum + m.amount, 0);
  const savedThisMonth = receivedSum - gaveSum;

  const sortedSpent = Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a]);
  const topSpendCategory = sortedSpent[0] || 'N/A';
  const pendingDuesCount = filtered.filter((m) => m.status === 'pending').length;

  // EXTRA FRIENDS DEEP ANALYTICS
  const avgLendingSize = filtered.length > 0 ? Math.round(gaveSum / filtered.length) : 0;
  const activeContacts = Array.from(new Set(filtered.map(m => m.contactName)));
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

  const maxBarVal = Math.max(...monthlyBarData.map((d) => Math.max(d.income, d.expense)), 1000);

  const expenseCategories = ['Rent', 'Food', 'Travel', 'Bills', 'Shopping', 'Entertainment', 'Other'];
  const expenseColors = ['#EF4444', '#F5C518', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#9CA3AF'];

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
    if (savingsRate > 35) return { badge: 'Super Saving 🌟', desc: 'Outstanding asset generation!', color: '#10B981' };
    if (savingsRate > 15) return { badge: 'Healthy 👍', desc: 'Secure asset accumulation.', color: '#3B82F6' };
    if (savingsRate >= 0) return { badge: 'Tight ⚠️', desc: 'Expenses are close to earnings.', color: '#F5C518' };
    return { badge: 'Deficit 🚨', desc: 'Spending exceeds total earnings.', color: '#EF4444' };
  };
  const healthScore = getEfficiencyScore();

  const monthlySavings = last6Months.map((m) => {
    const monthFinances = filteredFinances.filter((f) => f.date.startsWith(m.key));
    const income = monthFinances.filter((f) => f.type === 'income').reduce((sum, f) => sum + f.amount, 0);
    const expense = monthFinances.filter((f) => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);
    return income - expense;
  });

  const maxSavings = Math.max(...monthlySavings.map(Math.abs), 1000);
  const savingsPoints = monthlySavings.map((val, idx) => {
    const x = paddingX + (idx / (monthlySavings.length - 1)) * (svgWidth - 2 * paddingX);
    const midY = svgHeight / 2;
    const y = midY - (val / maxSavings) * (midY - paddingY);
    return { x, y };
  });

  const savingsLinePath = savingsPoints.reduce((path, pt, i) => (i === 0 ? `M${pt.x},${pt.y}` : `${path} L${pt.x},${pt.y}`), '');
  const savingsAreaPath = savingsPoints.length > 0
    ? `${savingsLinePath} L${savingsPoints[savingsPoints.length - 1].x},${svgHeight / 2} L${savingsPoints[0].x},${svgHeight / 2} Z`
    : '';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
        <TouchableOpacity onPress={() => setRangeModalVisible(true)}>
          <Icon 
            name="calendar-outline" 
            size={24} 
            color={isCustomRange ? COLORS.primary : COLORS.text} 
          />
        </TouchableOpacity>
      </View>

      {/* Date Range Badge indicator */}
      {isCustomRange && (
        <View style={styles.customRangeIndicator}>
          <Text style={styles.customRangeText}>
            📅 Custom Range: {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
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
            Friends & Family
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.trackBtn, track === 'personal' && styles.trackBtnActive]}
          onPress={() => setTrack('personal')}
        >
          <Text style={[styles.trackBtnText, track === 'personal' && styles.trackBtnTextActive]}>
            Personal Finance
          </Text>
        </TouchableOpacity>
      </View>

      {track === 'friends' ? (
        <>
          {/* Timeframe Selector (Only if custom range is not active) */}
          {!isCustomRange && (
            <View style={styles.segmentControl}>
              {(['Week', 'Month', 'Year'] as const).map((t) => (
                <View
                  key={t}
                  onTouchEnd={() => setTimeframe(t)}
                  style={timeframe === t ? styles.segmentActive : styles.segmentInactive}
                >
                  <Text style={timeframe === t ? styles.segmentTextActive : styles.segmentText}>{t}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.sectionTitle}>Spending Overview</Text>

          {/* Donut Card */}
          <View style={styles.overviewCard}>
            <View style={styles.donutContainer}>
              <Svg width={120} height={120} viewBox="0 0 120 120">
                {totalSpent === 0 ? (
                  <Circle cx="60" cy="60" r="45" stroke="#E5E7EB" strokeWidth="20" fill="transparent" />
                ) : (
                  donutSlices.map((slice, i) => (
                    <Circle
                      key={i}
                      cx="60"
                      cy="60"
                      r="45"
                      stroke={slice.color}
                      strokeWidth="20"
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
                  {preferences.currency}
                  {totalSpent.toLocaleString()}
                </Text>
                <Text style={styles.donutLabel}>Total</Text>
              </View>
            </View>

            {/* Legend */}
            <View style={styles.legendContainer}>
              {donutSlices.map((slice, i) => (
                <View key={i} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                  <View style={styles.legendText}>
                    <Text style={styles.legendLabel}>{slice.label}</Text>
                    <Text style={styles.legendPercent}>{slice.percent}%</Text>
                  </View>
                  <Text style={styles.legendAmount}>
                    {preferences.currency}
                    {slice.amount.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Expense Trend Card */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Expense Trend</Text>
            {!isCustomRange && (
              <Text style={styles.dropdownText}>
                This {timeframe} <Icon name="chevron-down" size={12} />
              </Text>
            )}
          </View>

          <View style={styles.chartMock}>
            <View style={styles.chartWithYAxis}>
              {/* Y Axis Labels */}
              <View style={styles.yAxisLabels}>
                <Text style={styles.yAxisText}>{preferences.currency}{Math.round(maxVal)}</Text>
                <Text style={styles.yAxisText}>{preferences.currency}{Math.round(maxVal * 0.6)}</Text>
                <Text style={styles.yAxisText}>{preferences.currency}{Math.round(maxVal * 0.3)}</Text>
                <Text style={styles.yAxisText}>{preferences.currency}0</Text>
              </View>

              {/* SVG Line Graph */}
              <View style={{ flex: 1 }}>
                <Svg width="100%" height={150} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                  <Path d={`M0,20 L${svgWidth},20`} stroke="#F3F4F6" strokeWidth="1" />
                  <Path d={`M0,65 L${svgWidth},65`} stroke="#F3F4F6" strokeWidth="1" />
                  <Path d={`M0,110 L${svgWidth},110`} stroke="#F3F4F6" strokeWidth="1" />
                  <Path d={`M0,130 L${svgWidth},130`} stroke="#F3F4F6" strokeWidth="1" />

                  {areaPath !== '' && <Path d={areaPath} fill="rgba(245, 197, 24, 0.15)" />}
                  {linePath !== '' && <Path d={linePath} fill="none" stroke={COLORS.primary} strokeWidth="3" />}
                </Svg>
              </View>
            </View>

            <View style={styles.chartXAxis}>
              {trend.labels.map((d) => (
                <Text key={d} style={styles.xAxisText}>
                  {d}
                </Text>
              ))}
            </View>
          </View>

          {/* Quick Insights */}
          <Text style={styles.sectionTitle}>Lending Insights</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.insightsRow}>
            <View style={styles.insightCard}>
              <View style={[styles.insightIcon, { backgroundColor: COLORS.warningSoft }]}>
                <Icon name="star" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.insightValue}>
                {preferences.currency}
                {savedThisMonth.toLocaleString()}
              </Text>
              <Text style={styles.insightLabel}>Lending Balance</Text>
            </View>

            <View style={styles.insightCard}>
              <View style={[styles.insightIcon, { backgroundColor: COLORS.warningSoft }]}>
                <Icon name="wallet" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.insightValue}>
                {preferences.currency}
                {avgLendingSize.toLocaleString()}
              </Text>
              <Text style={styles.insightLabel}>Avg Transaction</Text>
            </View>

            <View style={styles.insightCard}>
              <View style={[styles.insightIcon, { backgroundColor: '#E0F2FE' }]}>
                <Icon name="people" size={20} color="#0284C7" />
              </View>
              <Text style={styles.insightValue} numberOfLines={1}>
                {highestDebtorName}
              </Text>
              <Text style={styles.insightLabel}>
                Top Debtor: {preferences.currency}{highestDebtorAmt}
              </Text>
            </View>
          </ScrollView>
        </>
      ) : (
        <>
          {/* PERSONAL FINANCE TRACK */}
          <Text style={styles.sectionTitle}>Income vs Expense (Last 6 Months)</Text>
          <View style={styles.chartMock}>
            <View style={styles.chartWithYAxis}>
              <View style={styles.yAxisLabels}>
                <Text style={styles.yAxisText}>{preferences.currency}{Math.round(maxBarVal)}</Text>
                <Text style={styles.yAxisText}>{preferences.currency}{Math.round(maxBarVal * 0.5)}</Text>
                <Text style={styles.yAxisText}>{preferences.currency}0</Text>
              </View>

              {/* Side-by-Side SVG Bar Chart */}
              <View style={{ flex: 1 }}>
                <Svg width="100%" height={150} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                  <Path d={`M0,20 L${svgWidth},20`} stroke="#F3F4F6" strokeWidth="1" />
                  <Path d={`M0,75 L${svgWidth},75`} stroke="#F3F4F6" strokeWidth="1" />
                  <Path d={`M0,130 L${svgWidth},130`} stroke="#F3F4F6" strokeWidth="1" />

                  {monthlyBarData.map((d, idx) => {
                    const stepX = (svgWidth - 20) / 6;
                    const baseX = 10 + idx * stepX;
                    const barW = 10;
                    
                    const incH = (d.income / maxBarVal) * 100;
                    const expH = (d.expense / maxBarVal) * 100;

                    return (
                      <React.Fragment key={idx}>
                        <Rect
                          x={baseX}
                          y={130 - incH}
                          width={barW}
                          height={incH}
                          fill="#10B981"
                          rx="3"
                        />
                        <Rect
                          x={baseX + barW + 2}
                          y={130 - expH}
                          width={barW}
                          height={expH}
                          fill="#EF4444"
                          rx="3"
                        />
                      </React.Fragment>
                    );
                  })}
                </Svg>
              </View>
            </View>
            
            <View style={styles.chartXAxis}>
              {monthlyBarData.map((d) => (
                <Text key={d.label} style={styles.xAxisText}>
                  {d.label}
                </Text>
              ))}
            </View>
          </View>

          {/* Expense Category Donut */}
          <Text style={styles.sectionTitle}>Expense Category Distribution</Text>
          <View style={styles.overviewCard}>
            <View style={styles.donutContainer}>
              <Svg width={120} height={120} viewBox="0 0 120 120">
                {totalPersonalSpent === 0 ? (
                  <Circle cx="60" cy="60" r="45" stroke="#E5E7EB" strokeWidth="20" fill="transparent" />
                ) : (
                  personalDonutSlices.map((slice, i) => (
                    <Circle
                      key={i}
                      cx="60"
                      cy="60"
                      r="45"
                      stroke={slice.color}
                      strokeWidth="20"
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
                  {preferences.currency}
                  {totalPersonalSpent.toLocaleString()}
                </Text>
                <Text style={styles.donutLabel}>Spent</Text>
              </View>
            </View>

            {/* Legend */}
            <View style={styles.legendContainer}>
              {personalDonutSlices.filter(s => s.amount > 0).map((slice, i) => (
                <View key={i} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                  <View style={styles.legendText}>
                    <Text style={styles.legendLabel}>{slice.label}</Text>
                    <Text style={styles.legendPercent}>{slice.percent}%</Text>
                  </View>
                  <Text style={styles.legendAmount}>
                    {preferences.currency}
                    {slice.amount.toLocaleString()}
                  </Text>
                </View>
              ))}
              {totalPersonalSpent === 0 && (
                <Text style={{ fontSize: 12, color: COLORS.gray }}>No personal expenses logged yet.</Text>
              )}
            </View>
          </View>

          {/* Deep Personal Finance Insights */}
          <Text style={styles.sectionTitle}>Personal Financial Health</Text>
          <View style={styles.savingsRateCard}>
            <Svg width={70} height={70} viewBox="0 0 36 36">
              <Circle cx="18" cy="18" r="15.91" fill="transparent" stroke="#E5E7EB" strokeWidth="3" />
              <Circle
                cx="18"
                cy="18"
                r="15.91"
                fill="transparent"
                stroke={savingsRate >= 0 ? '#10B981' : '#EF4444'}
                strokeWidth="3"
                strokeDasharray={`${Math.max(0, Math.min(100, Math.abs(savingsRate)))} 100`}
                rotation="-90"
                origin="18, 18"
              />
            </Svg>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={[styles.savingsRateText, { color: healthScore.color }]}>
                {healthScore.badge} ({savingsRate}%)
              </Text>
              <Text style={styles.savingsRateLabel}>{healthScore.desc}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Personal Cash Flow Analysis</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.insightsRow}>
            <View style={styles.insightCard}>
              <View style={[styles.insightIcon, { backgroundColor: '#E8F5E9' }]}>
                <Icon name="trending-up" size={20} color="#2E7D32" />
              </View>
              <Text style={styles.insightValue}>
                {preferences.currency}
                {dailySpendRate.toLocaleString()}
              </Text>
              <Text style={styles.insightLabel}>Daily Spend Rate</Text>
            </View>

            <View style={styles.insightCard}>
              <View style={[styles.insightIcon, { backgroundColor: '#FFF3E0' }]}>
                <Icon name="cart-outline" size={20} color="#E65100" />
              </View>
              <Text style={styles.insightValue}>
                {preferences.currency}
                {largestTx ? largestTx.amount.toLocaleString() : 0}
              </Text>
              <Text style={styles.insightLabel} numberOfLines={1}>
                Peak: {largestTx ? largestTx.title : 'N/A'}
              </Text>
            </View>

            <View style={styles.insightCard}>
              <View style={[styles.insightIcon, { backgroundColor: '#E1F5FE' }]}>
                <Icon name="stats-chart" size={20} color="#0284C7" />
              </View>
              <Text style={styles.insightValue}>
                {preferences.currency}
                {totalPersonalSavings.toLocaleString()}
              </Text>
              <Text style={styles.insightLabel}>Net Inflow</Text>
            </View>
          </ScrollView>

          {/* Month over Month Net Savings Line Graph */}
          <Text style={styles.sectionTitle}>Month-over-Month Savings Trend</Text>
          <View style={styles.chartMock}>
            <View style={styles.chartWithYAxis}>
              <View style={styles.yAxisLabels}>
                <Text style={styles.yAxisText}>{preferences.currency}{Math.round(maxSavings)}</Text>
                <Text style={styles.yAxisText}>{preferences.currency}0</Text>
                <Text style={styles.yAxisText}>-{preferences.currency}{Math.round(maxSavings)}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Svg width="100%" height={150} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                  <Path d={`M0,20 L${svgWidth},20`} stroke="#F3F4F6" strokeWidth="1" />
                  <Path d={`M0,75 L${svgWidth},75`} stroke="#D1D5DB" strokeWidth="1.5" strokeDasharray="3 3" />
                  <Path d={`M0,130 L${svgWidth},130`} stroke="#F3F4F6" strokeWidth="1" />

                  {savingsAreaPath !== '' && <Path d={savingsAreaPath} fill={savingsRate >= 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)"} />}
                  {savingsLinePath !== '' && <Path d={savingsLinePath} fill="none" stroke={savingsRate >= 0 ? '#10B981' : '#EF4444'} strokeWidth="3" />}
                </Svg>
              </View>
            </View>

            <View style={styles.chartXAxis}>
              {last6Months.map((m) => (
                <Text key={m.label} style={styles.xAxisText}>
                  {m.label}
                </Text>
              ))}
            </View>
          </View>
        </>
      )}

      {/* EXPORT OPTIONS SECTION */}
      <Text style={styles.sectionTitle}>Download Audit Statement</Text>
      <View style={styles.exportContainer}>
        <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' }]} onPress={handleExportCSV}>
          <Icon name="document-text-outline" size={20} color="#2E7D32" />
          <Text style={[styles.exportBtnText, { color: '#2E7D32' }]}>Export Excel (XLSX)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2' }]} onPress={handleExportPDF}>
          <Icon name="receipt-outline" size={20} color="#C62828" />
          <Text style={[styles.exportBtnText, { color: '#C62828' }]}>Export PDF Ledger</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL: Calendar Date Range Selector */}
      <Modal visible={rangeModalVisible} animationType="slide" transparent>
        <View style={styles.modalRoot}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Custom Date Range</Text>
              <TouchableOpacity onPress={() => setRangeModalVisible(false)}>
                <Icon name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 16, marginBottom: 24 }}>
              <Text style={styles.modalSub}>Pick your start and end dates to filter all spending data:</Text>
              
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
                style={[styles.rangeActionBtn, { backgroundColor: COLORS.grayLight, flex: 1 }]}
                onPress={() => {
                  setIsCustomRange(false);
                  setRangeModalVisible(false);
                }}
              >
                <Text style={[styles.rangeActionText, { color: COLORS.text }]}>Reset</Text>
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
    backgroundColor: COLORS.white,
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
    color: COLORS.text,
  },
  customRangeIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFDF4',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  customRangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  trackSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.grayLight,
    borderRadius: 24,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  trackBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  trackBtnActive: {
    backgroundColor: COLORS.secondary,
  },
  trackBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
  },
  trackBtnTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.grayLight,
    borderRadius: 20,
    padding: 4,
    marginBottom: 24,
  },
  segmentActive: {
    flex: 1,
    backgroundColor: COLORS.primary,
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
    color: COLORS.white,
    fontWeight: '700',
  },
  segmentText: {
    color: COLORS.gray,
    fontWeight: '500',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 10,
    marginBottom: 16,
  },
  dropdownText: {
    color: COLORS.gray,
    fontSize: 14,
    fontWeight: '500',
  },
  overviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  donutContainer: {
    width: 120,
    height: 120,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  donutAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  donutLabel: {
    fontSize: 9,
    color: COLORS.gray,
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
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  legendPercent: {
    fontSize: 10,
    color: COLORS.gray,
  },
  legendAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  chartMock: {
    marginBottom: 24,
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
    color: COLORS.gray,
    textAlign: 'right',
    paddingRight: 6,
  },
  chartXAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingLeft: 45,
    paddingRight: 10,
  },
  xAxisText: {
    fontSize: 10,
    color: COLORS.gray,
  },
  insightsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  insightCard: {
    width: 140,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: COLORS.white,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  insightLabel: {
    fontSize: 11,
    color: COLORS.gray,
  },
  savingsRateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 24,
  },
  savingsRateText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  savingsRateLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  exportContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  exportBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(11, 19, 43, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
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
    color: COLORS.text,
  },
  modalSub: {
    fontSize: 12,
    color: COLORS.gray,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  pickerTrigger: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.gray,
  },
  pickerVal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 4,
  },
  rangeActionBtn: {
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
  },
  rangeActionText: {
    fontWeight: '700',
    fontSize: 14,
  },
});
