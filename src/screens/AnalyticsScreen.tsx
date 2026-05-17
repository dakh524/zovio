import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import Svg, { Circle, Path } from 'react-native-svg';

export const AnalyticsScreen = () => {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
        <Icon name="calendar-outline" size={24} color={COLORS.text} />
      </View>

      <View style={styles.segmentControl}>
        <View style={styles.segmentActive}><Text style={styles.segmentTextActive}>Week</Text></View>
        <View style={styles.segmentInactive}><Text style={styles.segmentText}>Month</Text></View>
        <View style={styles.segmentInactive}><Text style={styles.segmentText}>Year</Text></View>
      </View>

      <Text style={styles.sectionTitle}>Spending Overview</Text>

      <View style={styles.overviewCard}>
        <View style={styles.donutContainer}>
          <Svg width={120} height={120} viewBox="0 0 120 120">
            <Circle cx="60" cy="60" r="45" stroke="#F5C518" strokeWidth="20" strokeDasharray="100 282" fill="transparent" rotation="-90" origin="60, 60" />
            <Circle cx="60" cy="60" r="45" stroke="#3B82F6" strokeWidth="20" strokeDasharray="110 282" fill="transparent" rotation="20" origin="60, 60" />
            <Circle cx="60" cy="60" r="45" stroke="#E5E7EB" strokeWidth="20" strokeDasharray="72 282" fill="transparent" rotation="130" origin="60, 60" />
          </Svg>
          <View style={styles.donutCenter}>
            <Text style={styles.donutAmount}>₹14,750</Text>
            <Text style={styles.donutLabel}>Total</Text>
          </View>
        </View>

        <View style={styles.legendContainer}>
          {[
            {color: '#F5C518', label: 'Food & Dining', percent: '40%', amount: '₹5,900'},
            {color: '#3B82F6', label: 'Petrol', percent: '25%', amount: '₹3,690'},
            {color: '#E5E7EB', label: 'Transport', percent: '15%', amount: '₹2,210'},
            {color: '#FCD34D', label: 'Shopping', percent: '12%', amount: '₹1,770'},
            {color: '#9CA3AF', label: 'Others', percent: '8%', amount: '₹1,180'}
          ].map((item, i) => (
            <View key={i} style={styles.legendRow}>
              <View style={[styles.legendDot, {backgroundColor: item.color}]} />
              <View style={styles.legendText}>
                <Text style={styles.legendLabel}>{item.label}</Text>
                <Text style={styles.legendPercent}>{item.percent}</Text>
              </View>
              <Text style={styles.legendAmount}>{item.amount}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Expense Trend</Text>
        <Text style={styles.dropdownText}>This Week <Icon name="chevron-down" size={12} /></Text>
      </View>

      <View style={styles.chartMock}>
         <Svg width="100%" height={150} viewBox="0 0 300 150">
           <Path d="M0,120 L50,80 L100,100 L150,40 L200,60 L250,20 L300,50" fill="none" stroke={COLORS.primary} strokeWidth="3" />
           <Path d="M0,120 L50,80 L100,100 L150,40 L200,60 L250,20 L300,50 L300,150 L0,150 Z" fill="rgba(245, 197, 24, 0.2)" />
           {/* Grid lines mock */}
           <Path d="M0,30 L300,30" stroke="#F3F4F6" strokeWidth="1" />
           <Path d="M0,60 L300,60" stroke="#F3F4F6" strokeWidth="1" />
           <Path d="M0,90 L300,90" stroke="#F3F4F6" strokeWidth="1" />
           <Path d="M0,120 L300,120" stroke="#F3F4F6" strokeWidth="1" />
         </Svg>
         <View style={styles.chartXAxis}>
           {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <Text key={d} style={styles.xAxisText}>{d}</Text>)}
         </View>
      </View>

      <Text style={styles.sectionTitle}>Quick Insights</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.insightsRow}>
        <View style={styles.insightCard}>
          <View style={[styles.insightIcon, {backgroundColor: COLORS.warningSoft}]}>
             <Icon name="star" size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.insightValue}>₹3,250</Text>
          <Text style={styles.insightLabel}>Saved This Month</Text>
        </View>
        <View style={styles.insightCard}>
          <View style={[styles.insightIcon, {backgroundColor: COLORS.warningSoft}]}>
             <Icon name="restaurant" size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.insightValue}>Food & Dining</Text>
          <Text style={styles.insightLabel}>Top Spend Category</Text>
        </View>
        <View style={styles.insightCard}>
          <View style={[styles.insightIcon, {backgroundColor: '#E0F2FE'}]}>
             <Icon name="document-text" size={20} color="#0284C7" />
          </View>
          <Text style={styles.insightValue}>5</Text>
          <Text style={styles.insightLabel}>Total Pending Dues</Text>
        </View>
      </ScrollView>
      
      <View style={{height: 100}} />
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
    fontSize: 16,
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
  chartXAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 10,
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
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  insightLabel: {
    fontSize: 12,
    color: COLORS.gray,
  },
});
