import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import Svg, { Circle, Path } from 'react-native-svg';
import { useZovio } from '../store/ZovioContext';

export const AnalyticsScreen = () => {
  const { memories, preferences } = useZovio();
  const [timeframe, setTimeframe] = useState<'Week' | 'Month' | 'Year'>('Week');

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
  const categoryColors = ['#F5C518', '#3B82F6', '#E5E7EB', '#FCD34D', '#9CA3AF'];

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
        // Map last 7 days starting from Monday
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
  // Total Saved This Month -> total received minus total gave
  const receivedSum = memories.filter((m) => m.type === 'received').reduce((sum, m) => sum + m.amount, 0);
  const gaveSum = memories.filter((m) => m.type === 'gave').reduce((sum, m) => sum + m.amount, 0);
  const savedThisMonth = receivedSum - gaveSum;

  // Top Spend Category
  const sortedSpent = Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a]);
  const topSpendCategory = sortedSpent[0] || 'N/A';

  // Total Pending Dues
  const pendingDuesCount = memories.filter((m) => m.status === 'pending').length;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
        <Icon name="calendar-outline" size={24} color={COLORS.text} />
      </View>

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
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
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
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  donutLabel: {
    fontSize: 10,
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
    fontSize: 12,
    color: COLORS.gray,
  },
});
