import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import Svg, { Path, Circle } from 'react-native-svg';
import { useZovio, Memory } from '../store/ZovioContext';
import { useNavigation } from '@react-navigation/native';

export const MoneyNotesScreen = () => {
  const navigation = useNavigation<any>();
  const { memories, deleteMemory, preferences } = useZovio();

  // Selected period toggle
  const [period, setPeriod] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Day');
  const [currentShift, setCurrentShift] = useState(0); // Offset in time

  // Modal State
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Memory | null>(null);
  const [journalModalVisible, setJournalModalVisible] = useState(false);

  // Dynamic Time Helper
  const getPeriodRange = () => {
    const today = new Date();
    if (period === 'Day') {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + currentShift);
      return {
        label: currentShift === 0 ? 'Today, ' + targetDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : targetDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
        filterFn: (m: Memory) => m.date === targetDate.toISOString().split('T')[0],
      };
    } else if (period === 'Week') {
      // Filter last 7 days of the offset week
      const start = new Date(today);
      start.setDate(today.getDate() - 7 + currentShift * 7);
      const end = new Date(today);
      end.setDate(today.getDate() + currentShift * 7);
      return {
        label: `${start.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`,
        filterFn: (m: Memory) => {
          const d = new Date(m.date);
          return d >= start && d <= end;
        },
      };
    } else if (period === 'Month') {
      const targetMonth = new Date(today.getFullYear(), today.getMonth() + currentShift, 1);
      return {
        label: targetMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        filterFn: (m: Memory) => {
          const d = new Date(m.date);
          return d.getMonth() === targetMonth.getMonth() && d.getFullYear() === targetMonth.getFullYear();
        },
      };
    } else {
      const targetYear = today.getFullYear() + currentShift;
      return {
        label: `Year ${targetYear}`,
        filterFn: (m: Memory) => new Date(m.date).getFullYear() === targetYear,
      };
    }
  };

  const periodRange = getPeriodRange();
  const periodMemories = memories.filter(periodRange.filterFn);

  // Earned / Spent Sums
  const earned = periodMemories.filter((m) => m.type === 'received').reduce((sum, m) => sum + m.amount, 0);
  const spent = periodMemories.filter((m) => m.type === 'gave').reduce((sum, m) => sum + m.amount, 0);
  const balance = earned - spent;

  // Pie Chart Calculations
  const total = earned + spent;
  const earnedPercentage = total > 0 ? Math.round((earned / total) * 100) : 50;
  const spentPercentage = total > 0 ? Math.round((spent / total) * 100) : 50;

  // Draw Pie Chart dynamically:
  // circumference = 2 * PI * r = 2 * 3.1415 * 25 = 157
  const r = 25;
  const c = 2 * Math.PI * r;
  const earnedStroke = (earnedPercentage / 100) * c;
  const spentStroke = c - earnedStroke;

  const handleShiftPeriod = (direction: 'back' | 'forward') => {
    if (direction === 'back') {
      setCurrentShift(currentShift - 1);
    } else {
      setCurrentShift(currentShift + 1);
    }
  };

  const handleQuickAdd = (type: 'gave' | 'received') => {
    navigation.navigate('LogMemory', { type });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Money Notes</Text>
        <Icon name="calendar-outline" size={24} color={COLORS.text} />
      </View>

      {/* Segment Selector */}
      <View style={styles.segmentControl}>
        {(['Day', 'Week', 'Month', 'Year'] as const).map((p) => (
          <TouchableOpacity
            key={p}
            style={period === p ? styles.segmentActive : styles.segmentInactive}
            onPress={() => {
              setPeriod(p);
              setCurrentShift(0); // Reset offset
            }}
          >
            <Text style={period === p ? styles.segmentTextActive : styles.segmentText}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Navigation Arrow */}
      <View style={styles.dateSelector}>
        <TouchableOpacity onPress={() => handleShiftPeriod('back')}>
          <Icon name="chevron-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.dateText}>{periodRange.label}</Text>
        <TouchableOpacity onPress={() => handleShiftPeriod('forward')}>
          <Icon name="chevron-forward" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <TouchableOpacity
            style={styles.summaryItem}
            onPress={() => handleQuickAdd('received')}
          >
            <View>
              <Text style={styles.summaryLabel}>Earned</Text>
              <Text style={styles.summaryValueEarned}>
                {preferences.currency}
                {earned.toLocaleString()}
              </Text>
            </View>
            <Icon name="add-circle" size={24} color={COLORS.success} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.summaryItem}
            onPress={() => handleQuickAdd('gave')}
          >
            <View>
              <Text style={styles.summaryLabel}>Spent</Text>
              <Text style={styles.summaryValueSpent}>
                {preferences.currency}
                {spent.toLocaleString()}
              </Text>
            </View>
            <Icon name="add-circle" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <Text style={[styles.balanceValue, { color: balance >= 0 ? COLORS.success : '#EF4444' }]}>
            {balance < 0 ? '-' : ''}
            {preferences.currency}
            {Math.abs(balance).toLocaleString()}
          </Text>
        </View>

        {/* Dynamic Pie Chart */}
        <View style={styles.pieContainer}>
          <View style={styles.pieLegendLeft}>
            <View style={styles.pieLegendDotGreen} />
            <Text style={styles.pieLegendTitle}>Earned</Text>
            <Text style={styles.pieLegendPercent}>{earnedPercentage}%</Text>
            <Text style={styles.pieLegendAmount}>
              {preferences.currency}
              {earned.toLocaleString()}
            </Text>
          </View>

          <View style={styles.pieSvg}>
            <Svg width={100} height={100} viewBox="0 0 100 100">
              <Circle
                cx="50"
                cy="50"
                r={r}
                fill="transparent"
                stroke="#EF4444"
                strokeWidth="16"
              />
              <Circle
                cx="50"
                cy="50"
                r={r}
                fill="transparent"
                stroke={COLORS.success}
                strokeWidth="16"
                strokeDasharray={`${earnedStroke} ${c}`}
                transform="rotate(-90 50 50)"
              />
            </Svg>
          </View>

          <View style={styles.pieLegendRight}>
            <View style={styles.pieLegendDotRed} />
            <Text style={styles.pieLegendTitle}>Spent</Text>
            <Text style={styles.pieLegendPercent}>{spentPercentage}%</Text>
            <Text style={styles.pieLegendAmount}>
              {preferences.currency}
              {spent.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      {/* Daily Journal List */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Daily Journal</Text>
        <TouchableOpacity onPress={() => setJournalModalVisible(true)}>
          <Text style={styles.viewAll}>View all</Text>
        </TouchableOpacity>
      </View>

      {periodMemories.slice(0, 5).map((item, index) => (
        <TouchableOpacity
          key={item.id}
          style={styles.journalRow}
          onPress={() => {
            setSelectedItem(item);
            setDetailVisible(true);
          }}
        >
          <Text style={styles.journalName}>{item.contactName} ({item.occasion})</Text>
          <View style={styles.journalRight}>
            <Text style={styles.journalAmount}>
              {preferences.currency}
              {item.amount.toLocaleString()}
            </Text>
            <Icon
              name={item.type === 'gave' ? 'arrow-down' : 'arrow-up'}
              size={16}
              color={item.type === 'gave' ? '#EF4444' : COLORS.success}
            />
          </View>
        </TouchableOpacity>
      ))}

      {periodMemories.length === 0 && (
        <Text style={{ textAlign: 'center', marginTop: 15, color: COLORS.gray }}>
          No records logged for this period.
        </Text>
      )}

      {/* Detail overlay modal with delete */}
      <Modal visible={detailVisible} animationType="fade" transparent>
        <View style={styles.detailModalRoot}>
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>Journal Detail</Text>
              <TouchableOpacity onPress={() => setDetailVisible(false)}>
                <Icon name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <View style={{ gap: 15 }}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Contact Name</Text>
                  <Text style={styles.detailValue}>{selectedItem.contactName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type</Text>
                  <Text style={[styles.detailValue, { color: selectedItem.type === 'gave' ? '#EF4444' : COLORS.success }]}>
                    {selectedItem.type.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text style={styles.detailValue}>
                    {preferences.currency}
                    {selectedItem.amount.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Occasion</Text>
                  <Text style={styles.detailValue}>{selectedItem.occasion}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>{selectedItem.date}</Text>
                </View>
                {selectedItem.notes && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Notes</Text>
                    <Text style={styles.detailValue}>{selectedItem.notes}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => {
                    Alert.alert(
                      'Delete Record',
                      'Are you sure you want to delete this memory?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: async () => {
                            await deleteMemory(selectedItem.id);
                            setDetailVisible(false);
                            Alert.alert('Success', 'Memory Deleted! 🗑️');
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Icon name="trash-outline" size={18} color={COLORS.white} />
                  <Text style={styles.deleteBtnText}>Delete Memory</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal: Full Journal List */}
      <Modal visible={journalModalVisible} animationType="slide" transparent>
        <View style={styles.modalRoot}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>All Journal Entries</Text>
              <TouchableOpacity onPress={() => setJournalModalVisible(false)}>
                <Icon name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={periodMemories}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.journalRow}
                  onPress={() => {
                    setSelectedItem(item);
                    setDetailVisible(true);
                  }}
                >
                  <Text style={styles.journalName}>{item.contactName} ({item.occasion})</Text>
                  <View style={styles.journalRight}>
                    <Text style={styles.journalAmount}>
                      {preferences.currency}
                      {item.amount.toLocaleString()}
                    </Text>
                    <Icon
                      name={item.type === 'gave' ? 'arrow-down' : 'arrow-up'}
                      size={16}
                      color={item.type === 'gave' ? '#EF4444' : COLORS.success}
                    />
                  </View>
                </TouchableOpacity>
              )}
            />
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
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  summaryValueSpent: {
    fontSize: 16,
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
    justifyContent: 'center',
    alignItems: 'center',
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
  detailModalRoot: {
    flex: 1,
    backgroundColor: 'rgba(11, 19, 43, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 10,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    color: COLORS.gray,
    fontSize: 14,
  },
  detailValue: {
    fontWeight: '700',
    color: COLORS.text,
    fontSize: 14,
  },
  deleteBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
    marginTop: 15,
  },
  deleteBtnText: {
    color: COLORS.white,
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
});
