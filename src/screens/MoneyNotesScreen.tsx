import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import Svg, { Path } from 'react-native-svg';

export const MoneyNotesScreen = () => {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Money Notes</Text>
        <Icon name="calendar-outline" size={24} color={COLORS.text} />
      </View>

      <View style={styles.segmentControl}>
        <View style={styles.segmentActive}><Text style={styles.segmentTextActive}>Day</Text></View>
        <View style={styles.segmentInactive}><Text style={styles.segmentText}>Week</Text></View>
        <View style={styles.segmentInactive}><Text style={styles.segmentText}>Month</Text></View>
        <View style={styles.segmentInactive}><Text style={styles.segmentText}>Year</Text></View>
      </View>

      <View style={styles.dateSelector}>
        <Icon name="chevron-back" size={20} color={COLORS.text} />
        <Text style={styles.dateText}>Today, 21 Sep 2025</Text>
        <Icon name="chevron-forward" size={20} color={COLORS.text} />
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <View>
              <Text style={styles.summaryLabel}>Earned</Text>
              <Text style={styles.summaryValueEarned}>₹2,850</Text>
            </View>
            <Icon name="add-circle" size={24} color={COLORS.success} />
          </View>
          <View style={styles.summaryItem}>
            <View>
              <Text style={styles.summaryLabel}>Spent</Text>
              <Text style={styles.summaryValueSpent}>₹1,450</Text>
            </View>
            <Icon name="add-circle" size={24} color={COLORS.success} />
          </View>
        </View>

        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <Text style={styles.balanceValue}>₹ 1,400</Text>
        </View>

        <View style={styles.pieContainer}>
          <View style={styles.pieLegendLeft}>
            <View style={styles.pieLegendDotGreen} />
            <Text style={styles.pieLegendTitle}>Earned</Text>
            <Text style={styles.pieLegendPercent}>66%</Text>
            <Text style={styles.pieLegendAmount}>₹2,850</Text>
          </View>
          
          <View style={styles.pieSvg}>
             <Svg width={100} height={100} viewBox="0 0 100 100">
               {/* 66% Green */}
               <Path d="M50 50 L50 0 A50 50 0 1 1 5 28 Z" fill={COLORS.success} />
               {/* 34% Red */}
               <Path d="M50 50 L5 28 A50 50 0 0 1 50 0 Z" fill="#EF4444" />
             </Svg>
          </View>

          <View style={styles.pieLegendRight}>
            <View style={styles.pieLegendDotRed} />
            <Text style={styles.pieLegendTitle}>Spent</Text>
            <Text style={styles.pieLegendPercent}>34%</Text>
            <Text style={styles.pieLegendAmount}>₹1,450</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Daily Journal</Text>
        <Text style={styles.viewAll}>View all</Text>
      </View>

      {[
        {name: 'Dinner with Rimi', amount: '₹750.00', type: 'spent'},
        {name: 'Auto to Office', amount: '₹120.00', type: 'spent'},
        {name: 'Project Payment', amount: '₹2,850.00', type: 'earned'},
        {name: 'Coffee', amount: '₹80.00', type: 'spent'},
      ].map((item, index) => (
        <View key={index} style={styles.journalRow}>
          <Text style={styles.journalName}>{item.name}</Text>
          <View style={styles.journalRight}>
            <Text style={styles.journalAmount}>{item.amount}</Text>
            <Icon 
              name={item.type === 'spent' ? 'arrow-down' : 'arrow-up'} 
              size={16} 
              color={item.type === 'spent' ? '#EF4444' : COLORS.success} 
            />
          </View>
        </View>
      ))}
      <View style={{height: 100}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
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
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 24,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '45%',
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.gray,
  },
  summaryValueEarned: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  summaryValueSpent: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  balanceContainer: {
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.success,
  },
  pieContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pieSvg: {
    width: 100,
    height: 100,
  },
  pieLegendLeft: {
    alignItems: 'flex-start',
  },
  pieLegendRight: {
    alignItems: 'flex-start',
  },
  pieLegendDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginBottom: 4,
  },
  pieLegendDotRed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginBottom: 4,
  },
  pieLegendTitle: {
    fontSize: 12,
    color: COLORS.gray,
  },
  pieLegendPercent: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  pieLegendAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  viewAll: {
    color: COLORS.gray,
    fontSize: 12,
  },
  journalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  journalName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  journalRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  journalAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
});
