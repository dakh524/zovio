import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useZovio } from '../store/ZovioContext';

const { width } = Dimensions.get('window');

export const AnalyticsScreen = () => {
  const { memories, preferences, finances } = useZovio();
  const [timeframe, setTimeframe] = useState<'Week' | 'Month' | 'Year'>('Week');
  const [track, setTrack] = useState<'friends' | 'personal'>('friends');

  // Helper: Filter records by timeframe
  const getFilteredMemories = () => {
    const now = new Date();
    return memories.filter((m) => {
      const recordDate = new Date(m.date);
      if (isNaN(recordDate.getTime())) return true; // fallback

      const diffTime = Math.abs(now.getTime() - recordDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (timeframe === 'Week') return diffDays <= 7;
      if (timeframe === 'Month') return diffDays <= 30;
      if (timeframe === 'Year') return diffDays <= 365;
      return true;
    });
  };

  const filtered = getFilteredMemories();

  // 1. Spending Overview (Donut Chart & Legend Calculations)
  const categories = ['Food & Dining', 'Petrol', 'Transport', 'Shopping', 'Others'];
  const categoryColors = ['#F5C518', '#3B82F6', '#EF4444', '#10B981', '#9CA3AF'];

  const categoryTotals = categories.reduce((acc, cat) => {
    acc[cat] = filtered
      .filter((m) => {
        // Map common inputs to key groups
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

  // Calculate DashArrays for SVG Donut (circumference = 2 * PI * r = 2 * 3.1415 * 45 = 282.7)
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

  // 2. Expense Trend Calculations
  const getTrendData = () => {
    if (timeframe === 'Week') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const totals = days.map((_, index) => {
        const dayRecords = filtered.filter((m) => {
          const d = new Date(m.date).getDay();
          const targetDay = index === 6 ? 0 : index + 1; // map Mon=1..Sun=0
          return d === targetDay;
        });
        return dayRecords.reduce((sum, m) => sum + m.amount, 0);
      });
      return { labels: days, data: totals };
    } else if (timeframe === 'Month') {
      const days = Array.from({ length: 15 }, (_, i) => `${(i + 1) * 2}`); // 15 points
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
  const maxVal = Math.max(...trend.data, 1000); // normalizer

  // Generate SVG points for dynamic Line Chart
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

  // 3. Quick Insights Calculations
  const receivedSum = memories.filter((m) => m.type === 'received').reduce((sum, m) => sum + m.amount, 0);
  const gaveSum = memories.filter((m) => m.type === 'gave').reduce((sum, m) => sum + m.amount, 0);
  const savedThisMonth = receivedSum - gaveSum;

  const sortedSpent = Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a]);
  const topSpendCategory = sortedSpent[0] || 'N/A';
  const pendingDuesCount = memories.filter((m) => m.status === 'pending').length;

  // ==========================================
  // PERSONAL FINANCE CALCULATIONS (ADD 1)
  // ==========================================
  const getLast6Months = () => {
    const result = [];
    const date = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      result.push({
        label: d.toLocaleString('default', { month: 'short' }),
        key: d.toISOString().substring(0, 7), // "YYYY-MM"
      });
    }
    return result;
  };
  const last6Months = getLast6Months();

  // Monthly Income vs Expense side-by-side
  const monthlyBarData = last6Months.map((m) => {
    const monthFinances = finances.filter((f) => f.date.startsWith(m.key));
    const income = monthFinances.filter((f) => f.type === 'income').reduce((sum, f) => sum + f.amount, 0);
    const expense = monthFinances.filter((f) => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);
    return { label: m.label, income, expense };
  });

  const maxBarVal = Math.max(...monthlyBarData.map((d) => Math.max(d.income, d.expense)), 1000);

  // Personal Expense Category Donut
  const expenseCategories = ['Rent', 'Food', 'Travel', 'Bills', 'Shopping', 'Entertainment', 'Other'];
  const expenseColors = ['#EF4444', '#F5C518', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#9CA3AF'];
  
  const personalCategoryTotals = expenseCategories.reduce((acc, cat) => {
    acc[cat] = finances
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

  // Savings rate percentage
  const totalPersonalIncome = finances.filter((f) => f.type === 'income').reduce((sum, f) => sum + f.amount, 0);
  const totalPersonalExpenses = finances.filter((f) => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);
  const totalPersonalSavings = totalPersonalIncome - totalPersonalExpenses;
  const savingsRate = totalPersonalIncome > 0 ? Math.round((totalPersonalSavings / totalPersonalIncome) * 100) : 0;

  // Month over month Net Savings line graph
  const monthlySavings = last6Months.map((m) => {
    const monthFinances = finances.filter((f) => f.date.startsWith(m.key));
    const income = monthFinances.filter((f) => f.type === 'income').reduce((sum, f) => sum + f.amount, 0);
    const expense = monthFinances.filter((f) => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);
    return income - expense;
  });

  const maxSavings = Math.max(...monthlySavings.map(Math.abs), 1000);
  const savingsPoints = monthlySavings.map((val, idx) => {
    const x = paddingX + (idx / (monthlySavings.length - 1)) * (svgWidth - 2 * paddingX);
    // Middle line is y=75. Above is positive savings, below is negative
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
        <Icon name="calendar-outline" size={24} color={COLORS.text} />
      </View>

      {/* Friends vs Personal Track Selector (ADD 1) */}
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
          {/* Timeframe Selector */}
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
            <Text style={styles.dropdownText}>
              This {timeframe} <Icon name="chevron-down" size={12} />
            </Text>
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
                  {/* Grid lines */}
                  <Path d={`M0,20 L${svgWidth},20`} stroke="#F3F4F6" strokeWidth="1" />
                  <Path d={`M0,65 L${svgWidth},65`} stroke="#F3F4F6" strokeWidth="1" />
                  <Path d={`M0,110 L${svgWidth},110`} stroke="#F3F4F6" strokeWidth="1" />
                  <Path d={`M0,130 L${svgWidth},130`} stroke="#F3F4F6" strokeWidth="1" />

                  {/* Area & Line */}
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
          <Text style={styles.sectionTitle}>Quick Insights</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.insightsRow}>
            <View style={styles.insightCard}>
              <View style={[styles.insightIcon, { backgroundColor: COLORS.warningSoft }]}>
                <Icon name="star" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.insightValue}>
                {preferences.currency}
                {savedThisMonth.toLocaleString()}
              </Text>
              <Text style={styles.insightLabel}>Saved This Month</Text>
            </View>

            <View style={styles.insightCard}>
              <View style={[styles.insightIcon, { backgroundColor: COLORS.warningSoft }]}>
                <Icon name="restaurant" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.insightValue} numberOfLines={1}>{topSpendCategory}</Text>
              <Text style={styles.insightLabel}>Top Spend Category</Text>
            </View>

            <View style={styles.insightCard}>
              <View style={[styles.insightIcon, { backgroundColor: '#E0F2FE' }]}>
                <Icon name="document-text" size={20} color="#0284C7" />
              </View>
              <Text style={styles.insightValue}>{pendingDuesCount}</Text>
              <Text style={styles.insightLabel}>Total Pending Dues</Text>
            </View>
          </ScrollView>
        </>
      ) : (
        <>
          {/* PERSONAL FINANCE TRACK (ADD 1) */}
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
                  {/* Grid lines */}
                  <Path d={`M0,20 L${svgWidth},20`} stroke="#F3F4F6" strokeWidth="1" />
                  <Path d={`M0,75 L${svgWidth},75`} stroke="#F3F4F6" strokeWidth="1" />
                  <Path d={`M0,130 L${svgWidth},130`} stroke="#F3F4F6" strokeWidth="1" />

                  {monthlyBarData.map((d, idx) => {
                    const stepX = (svgWidth - 20) / 6;
                    const baseX = 10 + idx * stepX;
                    const barW = 10;
                    
                    // Calc Heights
                    const incH = (d.income / maxBarVal) * 100;
                    const expH = (d.expense / maxBarVal) * 100;

                    return (
                      <React.Fragment key={idx}>
                        {/* Income Bar (Green) */}
                        <Rect
                          x={baseX}
                          y={130 - incH}
                          width={barW}
                          height={incH}
                          fill="#10B981"
                          rx="3"
                        />
                        {/* Expense Bar (Red) */}
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
            
            {/* X Axis */}
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

          {/* Savings Rate Card */}
          <Text style={styles.sectionTitle}>Savings Rate</Text>
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
                strokeDasharray={`${Math.max(0, Math.min(100, savingsRate))} 100`}
                rotation="-90"
                origin="18, 18"
              />
            </Svg>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.savingsRateText}>{savingsRate}% Savings Rate</Text>
              <Text style={styles.savingsRateLabel}>
                Net Savings: {preferences.currency}{totalPersonalSavings.toLocaleString()}
              </Text>
            </View>
          </View>

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
                  {/* Grid lines */}
                  <Path d={`M0,20 L${svgWidth},20`} stroke="#F3F4F6" strokeWidth="1" />
                  {/* Middle zero line */}
                  <Path d={`M0,75 L${svgWidth},75`} stroke="#D1D5DB" strokeWidth="1.5" strokeDasharray="3 3" />
                  <Path d={`M0,130 L${svgWidth},130`} stroke="#F3F4F6" strokeWidth="1" />

                  {/* Line & Area */}
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
});
