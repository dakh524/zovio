import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { Avatar, getAvatarType } from '../components/Avatar';
import { useZovio, Memory } from '../store/ZovioContext';
import { useNavigation, useRoute } from '@react-navigation/native';

export const ContactHistoryScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { contactName } = route.params || { contactName: '' };
  
  const { memories, updateMemoryStatus, triggerWhatsAppReminder, preferences, deleteMemory } = useZovio();

  // Filter memories with this contact
  const contactMemories = memories.filter((m) => m.contactName === contactName);

  // Stats Calculations
  const totalGave = contactMemories
    .filter((m) => m.type === 'gave')
    .reduce((sum, m) => sum + m.amount, 0);

  const totalReceived = contactMemories
    .filter((m) => m.type === 'received')
    .reduce((sum, m) => sum + m.amount, 0);

  const netBalance = totalReceived - totalGave; // Received minus Gave

  // Avatar index logic
  const contactRecord = memories.find((m) => m.contactName === contactName);
  const avatarIdx = contactRecord ? memories.indexOf(contactRecord) % 6 : 0;

  const handleSettleRecord = (item: Memory) => {
    Alert.alert(
      'Settle Transaction',
      `Mark ${preferences.currency}${item.amount.toLocaleString()} from ${item.contactName} as Settled?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Settle',
          onPress: async () => {
            await updateMemoryStatus(item.id, 'settled');
            Alert.alert('Success', `✅ Settled with ${item.contactName}!`);
          },
        },
      ]
    );
  };

  const handleLongPressRecord = (item: Memory) => {
    Alert.alert(
      'Manage Record',
      'Choose an action for this transaction:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: '✏️ Edit', 
          onPress: () => {
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

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Contact History</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Profile Card */}
      <View style={s.profileCard}>
        <Avatar type={getAvatarType(avatarIdx)} size={80} />
        <Text style={s.contactNameText}>{contactName}</Text>
        <Text style={s.relationText}>Friend & Family Diary</Text>

        {/* Mini Stats Grid */}
        <View style={s.statsGrid}>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Total Gave</Text>
            <Text style={[s.statVal, { color: '#EF4444' }]}>
              {preferences.currency}
              {totalGave.toLocaleString()}
            </Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Total Recv</Text>
            <Text style={[s.statVal, { color: COLORS.success }]}>
              {preferences.currency}
              {totalReceived.toLocaleString()}
            </Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Net Balance</Text>
            <Text style={[s.statVal, { color: netBalance >= 0 ? COLORS.success : '#EF4444' }]}>
              {netBalance >= 0 ? '+' : ''}
              {preferences.currency}
              {netBalance.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      <Text style={s.listHeader}>Money Ledger</Text>

      {/* Transaction List */}
      <FlatList
        data={contactMemories}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Text style={s.emptyText}>No transactions with {contactName} yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={s.ledgerCard}
            onLongPress={() => handleLongPressRecord(item)}
            activeOpacity={0.8}
          >
            <View style={s.ledgerHeader}>
              <View>
                <Text style={s.occasionText}>{item.occasion}</Text>
                <Text style={s.dateText}>{item.date}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.amountText, { color: item.type === 'gave' ? '#EF4444' : COLORS.success }]}>
                  {item.type === 'gave' ? '-' : '+'}
                  {preferences.currency}
                  {item.amount.toLocaleString()}
                </Text>
                <View style={[s.statusBadge, item.status === 'pending' ? s.statusPending : s.statusSettled]}>
                  <Text style={[s.statusText, item.status === 'pending' ? s.textPending : s.textSettled]}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>

            {item.status === 'pending' && (
              <View style={s.actionRow}>
                <TouchableOpacity
                  style={s.settleBtn}
                  onPress={() => handleSettleRecord(item)}
                >
                  <Icon name="checkmark-circle-outline" size={16} color={COLORS.secondary} />
                  <Text style={s.settleBtnText}>Settle Dues</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.remindBtn}
                  onPress={() => triggerWhatsAppReminder(item)}
                >
                  <Icon name="logo-whatsapp" size={16} color={COLORS.text} />
                  <Text style={s.remindBtnText}>WhatsApp</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFDF4',
    padding: 20,
    paddingTop: 50,
  },
  hdr: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  hdrTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  contactNameText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 12,
  },
  relationText: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 20,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.gray,
    marginBottom: 4,
  },
  statVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  listHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: COLORS.gray,
    fontSize: 14,
  },
  ledgerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  ledgerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  occasionText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  statusPending: {
    backgroundColor: COLORS.warningSoft,
  },
  statusSettled: {
    backgroundColor: COLORS.successSoft,
  },
  statusText: {
    fontSize: 8,
    fontWeight: '700',
  },
  textPending: {
    color: COLORS.warningText,
  },
  textSettled: {
    color: COLORS.success,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  settleBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  settleBtnText: {
    color: COLORS.secondary,
    fontWeight: '700',
    fontSize: 12,
  },
  remindBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.grayLight,
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  remindBtnText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 12,
  },
});
