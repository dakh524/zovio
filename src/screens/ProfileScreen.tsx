import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { Avatar } from '../components/Avatar';
import { useZovio } from '../store/ZovioContext';
import * as ImagePicker from 'expo-image-picker';

export const ProfileScreen = () => {
  const {
    memories,
    user,
    preferences,
    updateUserProfile,
    updatePreferences,
    exportToPDF,
    exportToExcel,
  } = useZovio();

  // Modal States
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [notiModalVisible, setNotiModalVisible] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);

  // Profile Edit fields
  const [newName, setNewName] = useState(user.name);

  // Dynamic calculations
  const totalGiven = memories
    .filter((m) => m.type === 'gave')
    .reduce((sum, m) => sum + m.amount, 0);

  const totalReceived = memories
    .filter((m) => m.type === 'received')
    .reduce((sum, m) => sum + m.amount, 0);

  const totalSettled = memories
    .filter((m) => m.status === 'settled')
    .reduce((sum, m) => sum + m.amount, 0);

  // Avatar picker handler using ImagePicker
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please grant library permissions to change avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      await updateUserProfile(user.name, result.assets[0].uri);
      Alert.alert('Success', 'Profile photo updated! 📸');
    }
  };

  const handleSaveProfile = async () => {
    if (!newName.trim()) {
      Alert.alert('Validation Error', 'Name cannot be empty.');
      return;
    }
    await updateUserProfile(newName.trim());
    setProfileModalVisible(false);
    Alert.alert('Success', 'Profile name updated! ✅');
  };

  const toggleWhatsAppReminders = async (val: boolean) => {
    await updatePreferences({ whatsappReminders: val });
  };

  return (
    <ScrollView style={s.root} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={s.hdr}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => setProfileModalVisible(true)}>
          <Icon name="settings-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Profile Details */}
      <View style={s.ps}>
        <TouchableOpacity style={s.aw} onPress={handlePickImage}>
          {user.avatar.startsWith('http') || user.avatar.startsWith('file') ? (
            <Avatar type="manBeard" size={120} /> // Fallback placeholder logic if parsing custom image
          ) : (
            <Avatar type={user.avatar as any} size={120} />
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setProfileModalVisible(true)}>
          <Text style={s.nm}>
            {user.name} <Icon name="create-outline" size={16} color={COLORS.gray} />
          </Text>
        </TouchableOpacity>
        <Text style={s.sub}>My Money Diary</Text>
      </View>

      {/* Stats Counter Row */}
      <View style={s.sc}>
        <View style={s.col}>
          <View style={s.si}>
            <Icon name="arrow-up" size={16} color={COLORS.primary} />
          </View>
          <Text style={s.sl}>Total Given</Text>
          <Text style={s.sa}>
            {preferences.currency}
            {totalGiven.toLocaleString()}
          </Text>
        </View>
        <View style={s.dv} />
        <View style={s.col}>
          <View style={s.si}>
            <Icon name="arrow-down" size={16} color={COLORS.primary} />
          </View>
          <Text style={s.sl}>Total Received</Text>
          <Text style={s.sa}>
            {preferences.currency}
            {totalReceived.toLocaleString()}
          </Text>
        </View>
        <View style={s.dv} />
        <View style={s.col}>
          <View style={s.si}>
            <Icon name="checkmark" size={16} color={COLORS.primary} />
          </View>
          <Text style={s.sl}>Total Settled</Text>
          <Text style={s.sa}>
            {preferences.currency}
            {totalSettled.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Settings list */}
      <View style={s.ol}>
        <View style={s.or}>
          <View style={s.ofl}>
            <Icon name="logo-whatsapp" size={20} color={COLORS.success} />
            <Text style={s.ot}>WhatsApp Reminders</Text>
          </View>
          <Switch
            value={preferences.whatsappReminders}
            onValueChange={toggleWhatsAppReminders}
            trackColor={{ false: '#767577', true: COLORS.success }}
            thumbColor="#fff"
          />
        </View>

        <TouchableOpacity style={s.or} onPress={() => setNotiModalVisible(true)}>
          <View style={s.ofl}>
            <Icon name="notifications-outline" size={20} color={COLORS.gray} />
            <Text style={s.ot}>Notification Settings</Text>
          </View>
          <Icon name="chevron-forward" size={20} color={COLORS.gray} />
        </TouchableOpacity>

        <TouchableOpacity style={s.or} onPress={() => setCurrencyModalVisible(true)}>
          <View style={s.ofl}>
            <Icon name="cash-outline" size={20} color={COLORS.gray} />
            <Text style={s.ot}>Currency Preference ({preferences.currency})</Text>
          </View>
          <Icon name="chevron-forward" size={20} color={COLORS.gray} />
        </TouchableOpacity>

        <TouchableOpacity style={s.or} onPress={() => setAboutModalVisible(true)}>
          <View style={s.ofl}>
            <Icon name="information-circle-outline" size={20} color={COLORS.gray} />
            <Text style={s.ot}>About Zovio</Text>
          </View>
          <Icon name="chevron-forward" size={20} color={COLORS.gray} />
        </TouchableOpacity>
      </View>

      {/* Export Section (Feature 3 & 4) */}
      <Text style={s.sectionHeader}>Exports & Reports</Text>
      <View style={s.exportRow}>
        <TouchableOpacity style={s.exportBtn} onPress={exportToPDF}>
          <Icon name="document-text" size={22} color={COLORS.white} />
          <Text style={s.exportBtnText}>Export PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.exportBtn, { backgroundColor: COLORS.success }]} onPress={exportToExcel}>
          <Icon name="grid" size={22} color={COLORS.white} />
          <Text style={s.exportBtnText}>Export Excel</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL 1: Edit Profile Name */}
      <Modal visible={profileModalVisible} animationType="fade" transparent>
        <View style={s.modalRoot}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Edit Profile</Text>
            <TextInput
              style={s.textInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Enter name"
              placeholderTextColor={COLORS.gray}
            />
            <View style={s.modalActionRow}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setProfileModalVisible(false)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleSaveProfile}>
                <Text style={s.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Notification Settings */}
      <Modal visible={notiModalVisible} animationType="fade" transparent>
        <View style={s.modalRoot}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Daily Reminders</Text>
            <View style={s.optionRow}>
              <Text style={s.optionText}>Daily reminder notifications</Text>
              <Switch
                value={preferences.dailyNotifications}
                onValueChange={async (val) => {
                  await updatePreferences({ dailyNotifications: val });
                }}
                trackColor={{ false: '#767577', true: COLORS.primary }}
                thumbColor="#fff"
              />
            </View>
            <View style={s.modalActionRow}>
              <TouchableOpacity style={s.saveBtn} onPress={() => setNotiModalVisible(false)}>
                <Text style={s.saveBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: Currency Selector */}
      <Modal visible={currencyModalVisible} animationType="fade" transparent>
        <View style={s.modalRoot}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Select Currency</Text>
            {['₹', '$', '€', '£', '¥'].map((curr) => (
              <TouchableOpacity
                key={curr}
                style={s.currencyRow}
                onPress={async () => {
                  await updatePreferences({ currency: curr });
                  setCurrencyModalVisible(false);
                  Alert.alert('Success', `Currency preference saved as ${curr}!`);
                }}
              >
                <Text style={s.currencyText}>{curr}</Text>
                {preferences.currency === curr && (
                  <Icon name="checkmark" size={18} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.cancelBtn} onPress={() => setCurrencyModalVisible(false)}>
              <Text style={s.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: About Zovio */}
      <Modal visible={aboutModalVisible} animationType="fade" transparent>
        <View style={s.modalRoot}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>About ZOVIO</Text>
            <View style={{ gap: 10, marginVertical: 15 }}>
              <Text style={s.aboutText}>Version: 1.0.0</Text>
              <Text style={s.aboutText}>Developer: Dakh Edu Solutions</Text>
              <Text style={s.aboutText}>Description: Personal Financial Diary</Text>
              <Text style={[s.aboutText, { color: COLORS.secondary, fontWeight: '700', marginTop: 5 }]}>
                For issues contact: +91 8667399640
              </Text>
            </View>
            <TouchableOpacity
              style={s.saveBtn}
              onPress={() => setAboutModalVisible(false)}
            >
              <Text style={s.saveBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFA', padding: 20, paddingTop: 50 },
  hdr: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 20 },
  ps: { alignItems: 'center', marginBottom: 32 },
  aw: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: COLORS.primary,
    overflow: 'hidden',
  },
  nm: { fontSize: 24, fontWeight: '800', color: COLORS.text, flexDirection: 'row', alignItems: 'center' },
  sub: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  sc: {
    backgroundColor: COLORS.secondary,
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  col: { alignItems: 'center', flex: 1 },
  si: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  sl: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  sa: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  dv: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)' },
  ol: { backgroundColor: COLORS.white, borderRadius: 24, padding: 16, marginBottom: 24 },
  or: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  ofl: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ot: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginVertical: 16,
  },
  exportRow: {
    flexDirection: 'row',
    gap: 12,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  exportBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(11, 19, 43, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    gap: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    color: COLORS.text,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    color: COLORS.gray,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: COLORS.secondary,
    fontWeight: '700',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  currencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  currencyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  aboutText: {
    fontSize: 14,
    color: COLORS.text,
  },
});
