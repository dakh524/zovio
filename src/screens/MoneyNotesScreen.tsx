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
  TextInput,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import Svg, { Path, Circle } from 'react-native-svg';
import { useZovio, Memory, FinanceEntry } from '../store/ZovioContext';
import { useNavigation } from '@react-navigation/native';

export const MoneyNotesScreen = () => {
  const navigation = useNavigation<any>();
  const {
    memories,
    deleteMemory,
    preferences,
    finances,
    addFinance,
    deleteFinance,
  } = useZovio();

  // Selected period toggle
  const [period, setPeriod] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Day');
  const [currentShift, setCurrentShift] = useState(0); // Offset in time

  // Modal State
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [journalModalVisible, setJournalModalVisible] = useState(false);

  // Quick Finance Entry Modal State (ADD 1)
  const [financeModalVisible, setFinanceModalVisible] = useState(false);
  const [finTitle, setFinTitle] = useState('');
  const [finAmount, setFinAmount] = useState('');
  const [finType, setFinType] = useState<'income' | 'expense'>('expense');
  const [finCategory, setFinCategory] = useState('Food');
  const [finNotes, setFinNotes] = useState('');

  // Dynamic Time Helper
  const getPeriodRange = () => {
    const today = new Date();
    if (period === 'Day') {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + currentShift);
      return {
        label: currentShift === 0 ? 'Today, ' + targetDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : targetDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
        filterFn: (dateStr: string) => dateStr === targetDate.toISOString().split('T')[0],
      };
    } else if (period === 'Week') {
      const start = new Date(today);
      start.setDate(today.getDate() - 7 + currentShift * 7);
      const end = new Date(today);
      end.setDate(today.getDate() + currentShift * 7);
      return {
        label: `${start.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`,
        filterFn: (dateStr: string) => {
          const d = new Date(dateStr);
          return d >= start && d <= end;
        },
      };
    } else if (period === 'Month') {
      const targetMonth = new Date(today.getFullYear(), today.getMonth() + currentShift, 1);
      return {
        label: targetMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        filterFn: (dateStr: string) => {
          const d = new Date(dateStr);
          return d.getMonth() === targetMonth.getMonth() && d.getFullYear() === targetMonth.getFullYear();
        },
      };
    } else {
      const targetYear = today.getFullYear() + currentShift;
      return {
        label: `Year ${targetYear}`,
        filterFn: (dateStr: string) => new Date(dateStr).getFullYear() === targetYear,
      };
    }
  };

  const periodRange = getPeriodRange();
  
  // Filter items matching the period
  const periodMemories = memories.filter((m) => periodRange.filterFn(m.date));
  const periodFinances = finances.filter((f) => periodRange.filterFn(f.date));

  // Earned / Spent Sums (Combines memories + finances for period)
  // received = Memory received + Finance income
  const earned = periodMemories.filter((m) => m.type === 'received').reduce((sum, m) => sum + m.amount, 0) +
                 periodFinances.filter((f) => f.type === 'income').reduce((sum, f) => sum + f.amount, 0);

  // spent = Memory gave + Finance expense
  const spent = periodMemories.filter((m) => m.type === 'gave').reduce((sum, m) => sum + m.amount, 0) +
                periodFinances.filter((f) => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);

  const balance = earned - spent;

  // Pie Chart Calculations
  const total = earned + spent;
  const earnedPercentage = total > 0 ? Math.round((earned / total) * 100) : 50;
  const spentPercentage = total > 0 ? Math.round((spent / total) * 100) : 50;

  // Draw Pie Chart dynamically:
  const r = 25;
  const c = 2 * Math.PI * r;
  const earnedStroke = (earnedPercentage / 100) * c;

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

  const handleOpenFinanceLog = (type: 'income' | 'expense') => {
    setFinType(type);
    setFinCategory(type === 'income' ? 'Salary' : 'Food');
    setFinTitle('');
    setFinAmount('');
    setFinNotes('');
    setFinanceModalVisible(true);
  };

  const handleSaveFinance = async () => {
    if (!finTitle || !finAmount) {
      Alert.alert('Required Fields', 'Please fill in a title and amount.');
      return;
    }
    const amt = parseFloat(finAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive number.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    await addFinance({
      title: finTitle,
      amount: amt,
      category: finCategory,
      type: finType,
      date: todayStr,
      notes: finNotes || undefined,
    });

    setFinanceModalVisible(false);
  };

  // Chronological Daily Journal combining both memories and finances (ADD 1)
  const mergedJournal = [
    ...periodMemories.map((m) => ({ ...m, source: 'memory' as const })),
    ...periodFinances.map((f) => ({
      id: f.id,
      contactName: f.title, // Map title to name
      occasion: f.category, // Map category to occasion
      amount: f.amount,
      date: f.date,
      type: f.type === 'income' ? ('received' as const) : ('gave' as const),
      status: 'settled' as const,
      notes: f.notes,
      source: 'finance' as const,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

      {/* Quick Entry Shortcuts (ADD 1) */}
      <View style={styles.quickEntryRow}>
        <TouchableOpacity
          style={[styles.quickEntryBtn, { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' }]}
          onPress={() => handleOpenFinanceLog('income')}
        >
          <Icon name="cash-outline" size={18} color="#2E7D32" />
          <Text style={[styles.quickEntryText, { color: '#2E7D32' }]}>+ Income</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickEntryBtn, { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2' }]}
          onPress={() => handleOpenFinanceLog('expense')}
        >
          <Icon name="card-outline" size={18} color="#C62828" />
          <Text style={[styles.quickEntryText, { color: '#C62828' }]}>- Expense</Text>
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

      {/* Separately grouped personal finance entries (ADD 1) */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Personal Finances</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
        {periodFinances.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.financeMiniCard}
            onPress={() => {
              setSelectedItem({ ...item, source: 'finance' });
              setDetailVisible(true);
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.finMiniTitle} numberOfLines={1}>{item.title}</Text>
              <View style={[styles.miniBadge, item.type === 'income' ? styles.badgeInc : styles.badgeExp]}>
                <Text style={styles.badgeText}>{item.type.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={[styles.finMiniAmt, { color: item.type === 'income' ? COLORS.success : '#EF4444' }]}>
              {preferences.currency}
              {item.amount.toLocaleString()}
            </Text>
            <Text style={styles.finMiniCat}>{item.category}</Text>
          </TouchableOpacity>
        ))}
        {periodFinances.length === 0 && (
          <View style={[styles.financeMiniCard, { width: 220, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ fontSize: 12, color: COLORS.gray }}>No personal entries this period.</Text>
          </View>
        )}
      </ScrollView>

      {/* Daily Journal List (Combines both memories and finances) (ADD 1) */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Daily Journal</Text>
        <TouchableOpacity onPress={() => setJournalModalVisible(true)}>
          <Text style={styles.viewAll}>View all</Text>
        </TouchableOpacity>
      </View>

      {mergedJournal.slice(0, 5).map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.journalRow}
          onPress={() => {
            setSelectedItem(item);
            setDetailVisible(true);
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon 
              name={item.source === 'finance' ? 'cash-outline' : 'people-outline'} 
              size={14} 
              color={COLORS.gray} 
            />
            <Text style={styles.journalName}>{item.contactName} ({item.occasion})</Text>
          </View>
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

      {mergedJournal.length === 0 && (
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
                  <Text style={styles.detailLabel}>
                    {selectedItem.source === 'finance' ? 'Title' : 'Contact Name'}
                  </Text>
                  <Text style={styles.detailValue}>
                    {selectedItem.source === 'finance' 
                      ? (selectedItem as FinanceEntry).title 
                      : (selectedItem as Memory).contactName}
                  </Text>
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
                  <Text style={styles.detailLabel}>
                    {selectedItem.source === 'finance' ? 'Category' : 'Occasion'}
                  </Text>
                  <Text style={styles.detailValue}>
                    {selectedItem.source === 'finance' 
                      ? (selectedItem as FinanceEntry).category 
                      : (selectedItem as Memory).occasion}
                  </Text>
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
                      `Are you sure you want to delete this ${selectedItem.source === 'finance' ? 'finance entry' : 'memory'}?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: async () => {
                            if (selectedItem.source === 'finance') {
                              await deleteFinance(selectedItem.id);
                            } else {
                              await deleteMemory(selectedItem.id);
                            }
                            setDetailVisible(false);
                            Alert.alert('Success', 'Record Deleted! 🗑️');
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Icon name="trash-outline" size={18} color={COLORS.white} />
                  <Text style={styles.deleteBtnText}>Delete Record</Text>
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
              data={mergedJournal}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.journalRow}
                  onPress={() => {
                    setSelectedItem(item);
                    setDetailVisible(true);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon 
                      name={item.source === 'finance' ? 'cash-outline' : 'people-outline'} 
                      size={14} 
                      color={COLORS.gray} 
                    />
                    <Text style={styles.journalName}>{item.contactName} ({item.occasion})</Text>
                  </View>
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

      {/* MODAL: Quick Personal Finance Entry (ADD 1) */}
      <Modal visible={financeModalVisible} animationType="slide" transparent>
        <View style={styles.modalRoot}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Quick Personal Finance</Text>
              <TouchableOpacity onPress={() => setFinanceModalVisible(false)}>
                <Icon name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
              {/* Type Switch */}
              <View style={styles.typeSelectorRow}>
                <TouchableOpacity
                  style={[styles.typeBtn, finType === 'income' && styles.typeBtnActiveInc]}
                  onPress={() => {
                    setFinType('income');
                    setFinCategory('Salary');
                  }}
                >
                  <Text style={[styles.typeBtnText, finType === 'income' && styles.typeBtnTextActive]}>
                    Income
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, finType === 'expense' && styles.typeBtnActiveExp]}
                  onPress={() => {
                    setFinType('expense');
                    setFinCategory('Food');
                  }}
                >
                  <Text style={[styles.typeBtnText, finType === 'expense' && styles.typeBtnTextActive]}>
                    Expense
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Title / Source</Text>
                <TextInput
                  placeholder={finType === 'income' ? 'e.g. Monthly Salary, Freelance project' : 'e.g. Electricity bill, Food shopping'}
                  value={finTitle}
                  onChangeText={setFinTitle}
                  style={styles.inputField}
                  placeholderTextColor={COLORS.gray}
                />
              </View>

              {/* Amount Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Amount ({preferences.currency})</Text>
                <TextInput
                  placeholder="e.g. 500"
                  value={finAmount}
                  onChangeText={setFinAmount}
                  keyboardType="numeric"
                  style={styles.inputField}
                  placeholderTextColor={COLORS.gray}
                />
              </View>

              {/* Category picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {(finType === 'income' 
                    ? ['Salary', 'Freelance', 'Business', 'Other'] 
                    : ['Rent', 'Food', 'Travel', 'Bills', 'Shopping', 'Entertainment', 'Other']
                  ).map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setFinCategory(cat)}
                      style={[styles.catChip, finCategory === cat && styles.catChipActive]}
                    >
                      <Text style={[styles.catChipText, finCategory === cat && styles.catChipTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes (Optional)</Text>
                <TextInput
                  placeholder="Additional details..."
                  value={finNotes}
                  onChangeText={setFinNotes}
                  style={styles.inputField}
                  placeholderTextColor={COLORS.gray}
                />
              </View>

              {/* Action Button */}
              <TouchableOpacity
                style={styles.saveFinBtn}
                onPress={handleSaveFinance}
              >
                <Text style={styles.saveFinBtnText}>Add Entry to Finance Book</Text>
              </TouchableOpacity>
            </ScrollView>
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
  quickEntryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickEntryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  quickEntryText: {
    fontSize: 13,
    fontWeight: '700',
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
  financeMiniCard: {
    width: 150,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  finMiniTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  miniBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeInc: {
    backgroundColor: COLORS.successSoft,
  },
  badgeExp: {
    backgroundColor: COLORS.warningSoft,
  },
  badgeText: {
    fontSize: 6,
    fontWeight: '800',
    color: COLORS.text,
  },
  finMiniAmt: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 8,
  },
  finMiniCat: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
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
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: COLORS.grayLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeBtnActiveInc: {
    backgroundColor: '#E8F5E9',
    borderColor: '#A5D6A7',
  },
  typeBtnActiveExp: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
  },
  typeBtnText: {
    fontWeight: '700',
    fontSize: 14,
    color: COLORS.text,
  },
  typeBtnTextActive: {
    color: COLORS.secondary,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray,
  },
  inputField: {
    backgroundColor: COLORS.grayLight,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 14,
    color: COLORS.text,
  },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.grayLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  catChipTextActive: {
    color: COLORS.secondary,
    fontWeight: '700',
  },
  saveFinBtn: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    marginTop: 12,
  },
  saveFinBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 16,
  },
});
