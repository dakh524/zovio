import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { Avatar, getAvatarType } from '../components/Avatar';
import { useZovio, Memory } from '../store/ZovioContext';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';

export const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const { memories, updateMemoryStatus, triggerWhatsAppReminder, preferences, finances, deleteMemory } = useZovio();

  // Modal States
  const [historyVisible, setHistoryVisible] = useState(false);
  const [remindVisible, setRemindVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Memory | null>(null);
  const [contactHistoryVisible, setContactHistoryVisible] = useState(false);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);

  // Search & Filter States (ADD 5)
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'pending' | 'settled' | 'gave' | 'received'>('all');
  const [historySort, setHistorySort] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  // Dynamic Calculations
  const totalOwed = memories
    .filter((m) => m.type === 'gave' && m.status === 'pending')
    .reduce((sum, m) => sum + m.amount, 0);

  // Monthly Personal Finance calculations (ADD 1)
  const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
  const currentMonthFinances = finances.filter((f) => f.date.startsWith(currentMonthStr));
  const totalIncome = currentMonthFinances
    .filter((f) => f.type === 'income')
    .reduce((sum, f) => sum + f.amount, 0);
  const totalExpenses = currentMonthFinances
    .filter((f) => f.type === 'expense')
    .reduce((sum, f) => sum + f.amount, 0);
  const totalSavings = totalIncome - totalExpenses;

  const pendingThisMonth = memories
    .filter((m) => m.status === 'pending')
    .reduce((sum, m) => sum + m.amount, 0);

  const settledThisMonth = memories
    .filter((m) => m.status === 'settled')
    .reduce((sum, m) => sum + m.amount, 0);

  // Filter & Sort History Records (ADD 5)
  const filteredMemories = memories
    .filter((m) => {
      const matchSearch =
        m.contactName.toLowerCase().includes(historySearch.toLowerCase()) ||
        m.occasion.toLowerCase().includes(historySearch.toLowerCase());

      if (!matchSearch) return false;

      if (historyFilter === 'all') return true;
      if (historyFilter === 'pending') return m.status === 'pending';
      if (historyFilter === 'settled') return m.status === 'settled';
      if (historyFilter === 'gave') return m.type === 'gave';
      if (historyFilter === 'received') return m.type === 'received';
      return true;
    })
    .sort((a, b) => {
      if (historySort === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (historySort === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (historySort === 'highest') return b.amount - a.amount;
      if (historySort === 'lowest') return a.amount - b.amount;
      return 0;
    });

  // Get unique contacts
  const uniqueContacts = Array.from(new Set(memories.map((m) => m.contactName))).map(
    (name) => {
      const record = memories.find((m) => m.contactName === name);
      return {
        name,
        avatarIdx: record ? memories.indexOf(record) % 6 : 0,
      };
    }
  );

  // Top 5 records for display
  const latestRecords = memories.slice(0, 5);

  const handleLongPressRecord = (item: Memory) => {
    Alert.alert(
      'Manage Record',
      'Choose an action for this transaction:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: '✏️ Edit', 
          onPress: () => {
            setHistoryVisible(false);
            setDetailVisible(false);
            navigation.navigate('LogMemory', { editMemoryId: item.id, mode: 'friends' });
          }
        },
        { 
          text: '🗑️ Delete', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Record',
              'Delete this record? This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    await deleteMemory(item.id);
                    setHistoryVisible(false);
                    setDetailVisible(false);
                    Alert.alert('Success', 'Record deleted 🗑️');
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  // Sparkline generator (Last 7 days trend of pending transactions)
  const renderSparkline = () => {
    // Generate mock sparkline path based on real transaction count/values
    const points = memories.slice(0, 7).map((m, i) => ({
      x: i * 20,
      y: 40 - Math.min(30, (m.amount / 500) * 5),
    }));

    if (points.length < 2) {
      return <Path d="M0,25 L100,25" stroke={COLORS.primary} strokeWidth="2" fill="none" />;
    }

    const pathData = points.reduce(
      (path, pt, i) => (i === 0 ? `M${pt.x},${pt.y}` : `${path} L${pt.x},${pt.y}`),
      ''
    );

    return <Path d={pathData} stroke={COLORS.primary} strokeWidth="2" fill="none" />;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>ZOVIO</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Profile')}>
            <Icon name="settings-outline" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Profile')}>
            <Icon name="notifications-outline" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Personal Finance Summary Cards (ADD 2) */}
      <View style={styles.financeStatsRow}>
        {/* Income Card */}
        <View style={[styles.financeCard, { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={[styles.financeCardLabel, { color: '#2E7D32', marginBottom: 0 }]}>Income</Text>
            <Icon name="arrow-up" size={14} color="#1B5E20" />
          </View>
          <Text style={[styles.financeCardVal, { color: '#1B5E20' }]}>
            {preferences.currency}{totalIncome.toLocaleString()}
          </Text>
        </View>

        {/* Expenses Card */}
        <View style={[styles.financeCard, { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={[styles.financeCardLabel, { color: '#C62828', marginBottom: 0 }]}>Expenses</Text>
            <Icon name="arrow-down" size={14} color="#B71C1C" />
          </View>
          <Text style={[styles.financeCardVal, { color: '#B71C1C' }]}>
            {preferences.currency}{totalExpenses.toLocaleString()}
          </Text>
        </View>

        {/* Savings Card */}
        <View style={[
          styles.financeCard, 
          { 
            backgroundColor: totalSavings >= 0 ? '#E8F5E9' : '#FFEBEE', 
            borderColor: totalSavings >= 0 ? '#A5D6A7' : '#FFCDD2' 
          }
        ]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={[styles.financeCardLabel, { color: totalSavings >= 0 ? '#2E7D32' : '#C62828', marginBottom: 0 }]}>Savings</Text>
            <Icon 
              name={totalSavings >= 0 ? "arrow-up" : "arrow-down"} 
              size={14} 
              color={totalSavings >= 0 ? '#1B5E20' : '#B71C1C'} 
            />
          </View>
          <Text style={[styles.financeCardVal, { color: totalSavings >= 0 ? '#1B5E20' : '#B71C1C' }]}>
            {preferences.currency}{totalSavings.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Total Owed to You</Text>
          <Icon name="eye-outline" size={16} color="rgba(255,255,255,0.7)" />
        </View>
        <Text style={styles.balance}>
          {preferences.currency}
          {totalOwed.toLocaleString()}
          <Text style={styles.balanceDecimal}>.00</Text>
        </Text>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          {[
            { icon: 'arrow-up', label: 'Gave', action: () => navigation.navigate('LogMemory', { type: 'gave' }) },
            { icon: 'arrow-down', label: 'Received', action: () => navigation.navigate('LogMemory', { type: 'received' }) },
            { icon: 'paper-plane', label: 'Remind', action: () => setRemindVisible(true) },
            { icon: 'time', label: 'History', action: () => setHistoryVisible(true) },
          ].map((item) => (
            <TouchableOpacity key={item.label} style={styles.actionItem} onPress={item.action}>
              <View style={styles.actionBtn}>
                <Icon name={item.icon as any} size={18} color={COLORS.text} />
              </View>
              <Text style={styles.actionText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Money Memories Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Money Memories</Text>
        <TouchableOpacity onPress={() => setHistoryVisible(true)}>
          <Text style={styles.viewAll}>View all</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.memoriesRow}>
        <View style={styles.avatarStack}>
          {uniqueContacts.slice(0, 5).map((contact, index) => (
            <TouchableOpacity
              key={contact.name}
              style={[styles.avatarWrapper, { marginLeft: index === 0 ? 0 : -15, zIndex: 10 - index }]}
              onPress={() => {
                navigation.navigate('ContactHistory', { contactName: contact.name });
              }}
            >
              <Avatar type={getAvatarType(contact.avatarIdx)} size={46} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.addBtn, { marginLeft: -15, zIndex: 0 }]}
            onPress={() => navigation.navigate('LogMemory')}
          >
            <Icon name="add" size={20} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={[styles.smallCard, styles.pendingCard]}>
          <View style={styles.smallCardHeader}>
            <Text style={styles.pendingText}>Pending</Text>
            <Icon name="information-circle-outline" size={16} color={COLORS.primary} />
          </View>
          <Text style={styles.pendingAmount}>
            {preferences.currency}
            {pendingThisMonth.toLocaleString()}
            <Text style={styles.pendingDecimal}>.00</Text>
          </Text>
        </View>

        <View style={[styles.smallCard, styles.settledCard]}>
          <View style={styles.smallCardHeader}>
            <View>
              <Text style={styles.settledText}>Settled</Text>
              <Text style={styles.settledSub}>This Month</Text>
            </View>
            <Icon name="checkmark-circle-outline" size={18} color={COLORS.gray} />
          </View>
          <Text style={styles.settledAmount}>
            {preferences.currency}
            {settledThisMonth.toLocaleString()}
            <Text style={styles.settledDecimal}>.00</Text>
          </Text>
        </View>
      </View>

      {/* Lending Records Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Lending Records</Text>
        <TouchableOpacity onPress={() => setHistoryVisible(true)}>
          <Text style={styles.viewAll}>View all</Text>
        </TouchableOpacity>
      </View>

      {latestRecords.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No transactions logged yet.</Text>
        </View>
      ) : (
        latestRecords.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={styles.recordRow}
            onPress={() => {
              setSelectedRecord(item);
              setDetailVisible(true);
            }}
            onLongPress={() => handleLongPressRecord(item)}
          >
            <Avatar type={getAvatarType(index % 6)} size={44} />
            <View style={styles.recordInfo}>
              <Text style={styles.name}>{item.contactName}</Text>
              <Text style={styles.type}>{item.occasion}</Text>
            </View>
            <View style={styles.recordRight}>
              <Text style={[styles.price, { color: item.type === 'gave' ? '#EF4444' : '#10B981' }]}>
                {item.type === 'gave' ? '-' : '+'}
                {preferences.currency}
                {item.amount.toLocaleString()}
              </Text>
              <View
                style={[
                  styles.statusPill,
                  item.status === 'pending' ? styles.statusPending : styles.statusSettled,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    item.status === 'pending' ? styles.textPending : styles.textSettled,
                  ]}
                >
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}

      {/* MODAL 1: Full Transaction History */}
      <Modal visible={historyVisible} animationType="slide" transparent>
        <View style={styles.modalRoot}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transaction History</Text>
              <TouchableOpacity onPress={() => setHistoryVisible(false)}>
                <Icon name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Search Bar (ADD 5) */}
            <View style={styles.searchBar}>
              <Icon name="search-outline" size={18} color={COLORS.gray} />
              <TextInput
                placeholder="Search contact or occasion..."
                value={historySearch}
                onChangeText={setHistorySearch}
                style={styles.searchInput}
                placeholderTextColor={COLORS.gray}
              />
              {historySearch.length > 0 && (
                <TouchableOpacity onPress={() => setHistorySearch('')}>
                  <Icon name="close-circle" size={18} color={COLORS.gray} style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Chips (ADD 5) */}
            <View style={{ marginBottom: 12 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
                {(['all', 'pending', 'settled', 'gave', 'received'] as const).map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    onPress={() => setHistoryFilter(filter)}
                    style={[styles.historyChip, historyFilter === filter && styles.historyChipActive]}
                  >
                    <Text style={[styles.historyChipText, historyFilter === filter && styles.historyChipTextActive]}>
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Sort selection (ADD 5) */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8, paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.gray }}>Sort:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {(['newest', 'oldest', 'highest', 'lowest'] as const).map((sort) => (
                  <TouchableOpacity
                    key={sort}
                    onPress={() => setHistorySort(sort)}
                    style={[styles.sortChip, historySort === sort && styles.sortChipActive]}
                  >
                    <Text style={[styles.sortChipText, historySort === sort && styles.sortChipTextActive]}>
                      {sort === 'newest' ? 'Newest' : sort === 'oldest' ? 'Oldest' : sort === 'highest' ? 'Highest' : 'Lowest'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <FlatList
              data={filteredMemories}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <TouchableOpacity 
                  style={styles.recordRow}
                  onPress={() => {
                    setSelectedRecord(item);
                    setDetailVisible(true);
                  }}
                  onLongPress={() => handleLongPressRecord(item)}
                >
                  <Avatar type={getAvatarType(index % 6)} size={44} />
                  <View style={styles.recordInfo}>
                    <Text style={styles.name}>{item.contactName}</Text>
                    <Text style={styles.type}>
                       {item.occasion} • {item.date}
                    </Text>
                  </View>
                  <View style={styles.recordRight}>
                    <Text style={[styles.price, { color: item.type === 'gave' ? '#EF4444' : '#10B981' }]}>
                      {item.type === 'gave' ? '-' : '+'}
                      {preferences.currency}
                      {item.amount.toLocaleString()}
                    </Text>
                    <View
                      style={[
                        styles.statusPill,
                        item.status === 'pending' ? styles.statusPending : styles.statusSettled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          item.status === 'pending' ? styles.textPending : styles.textSettled,
                        ]}
                      >
                        {item.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* MODAL 2: WhatsApp Reminders List */}
      <Modal visible={remindVisible} animationType="slide" transparent>
        <View style={styles.modalRoot}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pending Reminders</Text>
              <TouchableOpacity onPress={() => setRemindVisible(false)}>
                <Icon name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={memories.filter((m) => m.status === 'pending')}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No pending reminders found.</Text>
              }
              renderItem={({ item }) => (
                <View style={styles.reminderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.contactName}</Text>
                    <Text style={styles.type}>
                      Owes: {preferences.currency}
                      {item.amount.toLocaleString()} for {item.occasion}
                    </Text>
                  </View>

                  {preferences.whatsappReminders && (
                    <TouchableOpacity
                      style={styles.remindBadge}
                      onPress={() => triggerWhatsAppReminder(item)}
                    >
                      <Icon name="logo-whatsapp" size={16} color={COLORS.text} />
                      <Text style={styles.remindBadgeText}>Remind</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* MODAL 3: Record Details / Settle Action */}
      <Modal visible={detailVisible} animationType="fade" transparent>
        <View style={styles.detailModalRoot}>
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>Transaction Detail</Text>
              <TouchableOpacity onPress={() => setDetailVisible(false)}>
                <Icon name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedRecord && (
              <View style={{ gap: 15 }}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Contact Name</Text>
                  <Text style={styles.detailValue}>{selectedRecord.contactName}</Text>
                </View>
                {selectedRecord.whatsappNumber && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>WhatsApp</Text>
                    <Text style={styles.detailValue}>{selectedRecord.whatsappNumber}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text style={styles.detailValue}>
                    {preferences.currency}
                    {selectedRecord.amount.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Occasion</Text>
                  <Text style={styles.detailValue}>{selectedRecord.occasion}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>{selectedRecord.date}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={[styles.detailValue, { color: selectedRecord.status === 'pending' ? '#D97706' : '#10B981' }]}>
                    {selectedRecord.status.toUpperCase()}
                  </Text>
                </View>

                {selectedRecord.status === 'pending' && (
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 15 }}>
                    <TouchableOpacity
                      style={styles.settleBtn}
                      onPress={() => {
                        Alert.alert(
                          'Settle Transaction',
                          `Mark ${preferences.currency}${selectedRecord.amount.toLocaleString()} from ${selectedRecord.contactName} as Settled?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Yes, Settle',
                              onPress: async () => {
                                await updateMemoryStatus(selectedRecord.id, 'settled');
                                setDetailVisible(false);
                                Alert.alert('Success', `✅ Settled with ${selectedRecord.contactName}!`);
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <Text style={styles.settleBtnText}>Mark Settle</Text>
                    </TouchableOpacity>
                    {preferences.whatsappReminders && (
                      <TouchableOpacity
                        style={styles.detailRemindBtn}
                        onPress={() => triggerWhatsAppReminder(selectedRecord)}
                      >
                        <Icon name="logo-whatsapp" size={18} color={COLORS.secondary} />
                        <Text style={styles.detailRemindBtnText}>Remind</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 4: Contact's Transaction History */}
      <Modal visible={contactHistoryVisible} animationType="slide" transparent>
        <View style={styles.modalRoot}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedContact}'s Memories</Text>
              <TouchableOpacity onPress={() => setContactHistoryVisible(false)}>
                <Icon name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={memories.filter((m) => m.contactName === selectedContact)}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.reminderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.occasion}</Text>
                    <Text style={styles.type}>{item.date}</Text>
                  </View>
                  <Text style={[styles.price, { color: item.type === 'gave' ? '#EF4444' : '#10B981' }]}>
                    {item.type === 'gave' ? '-' : '+'}
                    {preferences.currency}
                    {item.amount.toLocaleString()}
                  </Text>
                </View>
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
  logo: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.secondary,
    letterSpacing: 1,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  balance: {
    color: COLORS.white,
    fontSize: 36,
    fontWeight: '800',
    marginVertical: 12,
  },
  balanceDecimal: {
    fontSize: 24,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingHorizontal: 10,
  },
  actionItem: {
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '500',
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
    fontWeight: '500',
  },
  memoriesRow: {
    marginBottom: 24,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    overflow: 'hidden',
  },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  smallCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    height: 120,
    justifyContent: 'space-between',
  },
  pendingCard: {
    backgroundColor: COLORS.secondary,
  },
  settledCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  smallCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pendingText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  settledText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 14,
  },
  settledSub: {
    color: COLORS.gray,
    fontSize: 10,
    marginTop: 2,
  },
  pendingAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
  },
  pendingDecimal: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  settledAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  settledDecimal: {
    fontSize: 14,
    color: COLORS.gray,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recordInfo: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontWeight: '700',
    color: COLORS.text,
    fontSize: 14,
  },
  type: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 2,
  },
  recordRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  price: {
    fontWeight: '700',
    fontSize: 14,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPending: {
    backgroundColor: COLORS.warningSoft,
  },
  statusSettled: {
    backgroundColor: COLORS.successSoft,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  textPending: {
    color: COLORS.warningText,
  },
  textSettled: {
    color: COLORS.success,
  },
  emptyContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.gray,
    fontSize: 14,
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
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  remindBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  remindBadgeText: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '700',
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
  settleBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  settleBtnText: {
    color: COLORS.secondary,
    fontWeight: '700',
  },
  detailRemindBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
  },
  detailRemindBtnText: {
    color: COLORS.secondary,
    fontWeight: '700',
  },
  financeStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  financeCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  financeCardLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  financeCardVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 8,
    padding: 0,
  },
  historyChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.grayLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  historyChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  historyChipTextActive: {
    color: COLORS.secondary,
    fontWeight: '700',
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFFDF4',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortChipActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  sortChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text,
  },
  sortChipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
});
