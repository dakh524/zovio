import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { Avatar, getAvatarType } from '../components/Avatar';

const RECORDS = [
  {name: 'Rimi Sharma', type: 'Dinner', amount: '₹750.00', status: 'Pending', avatarIdx: 1},
  {name: 'Zachary D.', type: 'Trip', amount: '-₹1,250.00', status: 'Pending', avatarIdx: 0},
  {name: 'Anne Joseph', type: 'Birthday', amount: '₹500.00', status: 'Settled', avatarIdx: 4},
  {name: 'Noah Wilson', type: 'Movie', amount: '₹350.00', status: 'Settled', avatarIdx: 5},
  {name: 'Lucas Martin', type: 'Loan', amount: '-₹2,000.00', status: 'Pending', avatarIdx: 2},
];

export const DashboardScreen = () => {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.logo}>ZOVIO</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <Icon name="settings-outline" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Icon name="notifications-outline" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.balanceCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Total Owed to You</Text>
          <Icon name="eye-outline" size={16} color="rgba(255,255,255,0.7)" />
        </View>
        <Text style={styles.balance}>₹29,890<Text style={styles.balanceDecimal}>.00</Text></Text>

        <View style={styles.actionRow}>
          {[
            {icon: 'arrow-up', label: 'Gave'},
            {icon: 'arrow-down', label: 'Received'},
            {icon: 'paper-plane', label: 'Remind'},
            {icon: 'time', label: 'History'},
          ].map((item) => (
            <View key={item.label} style={styles.actionItem}>
              <View style={styles.actionBtn}>
                <Icon name={item.icon as any} size={18} color={COLORS.text} />
              </View>
              <Text style={styles.actionText}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Money Memories</Text>
        <Text style={styles.viewAll}>View all</Text>
      </View>

      <View style={styles.memoriesRow}>
        <View style={styles.avatarStack}>
          {['Rimi','Zachary','Anne','Noah','Lucas'].map((name, index) => (
            <View key={name} style={[styles.avatarWrapper, { marginLeft: index === 0 ? 0 : -15, zIndex: 10 - index }]}>
              <Avatar type={getAvatarType(index)} size={46} />
            </View>
          ))}
          <TouchableOpacity style={[styles.addBtn, { marginLeft: -15, zIndex: 0 }]}>
            <Icon name="add" size={20} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.smallCard, styles.pendingCard]}>
          <View style={styles.smallCardHeader}>
            <Text style={styles.pendingText}>Pending</Text>
            <Icon name="information-circle-outline" size={16} color={COLORS.primary} />
          </View>
          <Text style={styles.pendingAmount}>₹12,450<Text style={styles.pendingDecimal}>.00</Text></Text>
        </View>

        <View style={[styles.smallCard, styles.settledCard]}>
          <View style={styles.smallCardHeader}>
            <View>
              <Text style={styles.settledText}>Settled</Text>
              <Text style={styles.settledSub}>This Month</Text>
            </View>
            <Icon name="checkmark-circle-outline" size={18} color={COLORS.gray} />
          </View>
          <Text style={styles.settledAmount}>₹17,870<Text style={styles.settledDecimal}>.00</Text></Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Lending Records</Text>
        <Text style={styles.viewAll}>View all</Text>
      </View>

      {RECORDS.map((item, index) => (
        <View key={index} style={styles.recordRow}>
          <Avatar type={getAvatarType(item.avatarIdx)} size={44} />
          <View style={styles.recordInfo}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.type}>{item.type}</Text>
          </View>
          <View style={styles.recordRight}>
            <Text style={styles.price}>{item.amount}</Text>
            <View style={[
              styles.statusPill,
              item.status === 'Pending' ? styles.statusPending : styles.statusSettled
            ]}>
              <Text style={[
                styles.statusText,
                item.status === 'Pending' ? styles.textPending : styles.textSettled
              ]}>{item.status}</Text>
            </View>
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
    color: COLORS.text,
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
});
