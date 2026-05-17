import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Modal,
  FlatList,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { Avatar, getAvatarType } from '../components/Avatar';
import { useZovio, Memory } from '../store/ZovioContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Contacts from 'expo-contacts';

export const LogMemoryScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { memories, addMemory, preferences, addFinance, finances, updateMemory, updateFinance } = useZovio();

  // Mode: 'friends' (Lending Diaries) or 'personal' (Finance Ledger)
  const [logMode, setLogMode] = useState<'friends' | 'personal'>('friends');

  // Route Parameters (preset type)
  const presetType = route.params?.type || 'gave';

  // Form State (shared)
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');

  // Form State (Friends & Family)
  const [contactName, setContactName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [showWhatsapp, setShowWhatsapp] = useState(false);
  const [selectedOccasion, setSelectedOccasion] = useState('Dinner');
  const [customOccasion, setCustomOccasion] = useState('');
  const [type, setType] = useState<'gave' | 'received'>(presetType);
  const [selectedContactIndex, setSelectedContactIndex] = useState<number | null>(null);

  // Form State (Personal Finance)
  const [finTitle, setFinTitle] = useState('');
  const [finType, setFinType] = useState<'income' | 'expense'>('expense');
  const [finCategory, setFinCategory] = useState('Food');

  // Modal States
  const [contactsModalVisible, setContactsModalVisible] = useState(false);

  // Device Contacts State (ADD - Pick Mobile Contacts)
  const [deviceContacts, setDeviceContacts] = useState<{ id: string; name: string; phoneNumber?: string }[]>([]);
  const [deviceContactsSearch, setDeviceContactsSearch] = useState('');
  const [deviceContactsModalVisible, setDeviceContactsModalVisible] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const loadDeviceContacts = async () => {
    setLoadingContacts(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers],
        });

        if (data && data.length > 0) {
          const mapped = data
            .filter((c) => c.name && c.phoneNumbers && c.phoneNumbers.length > 0)
            .map((c) => {
              const rawPhone = c.phoneNumbers?.[0]?.number || '';
              // Format clean 10-digit number
              const cleanPhone = rawPhone.replace(/\D/g, '');
              const formattedPhone = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

              return {
                id: c.id || Math.random().toString(),
                name: c.name,
                phoneNumber: formattedPhone,
              };
            })
            // Sort contacts alphabetically
            .sort((a, b) => a.name.localeCompare(b.name));

          setDeviceContacts(mapped);
          setDeviceContactsModalVisible(true);
        } else {
          Alert.alert('No Contacts', 'No contacts found on your device.');
        }
      } else {
        Alert.alert(
          'Permission Denied',
          'Please allow ZOVIO to access your contacts in your device settings.'
        );
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to retrieve device contacts.');
    } finally {
      setLoadingContacts(false);
    }
  };

  const filteredDeviceContacts = deviceContacts.filter(
    (c) =>
      c.name.toLowerCase().includes(deviceContactsSearch.toLowerCase()) ||
      (c.phoneNumber && c.phoneNumber.includes(deviceContactsSearch))
  );

  const handleSelectDeviceContact = (item: { name: string; phoneNumber?: string }) => {
    setContactName(item.name);
    if (item.phoneNumber) {
      setWhatsappNumber(item.phoneNumber);
      setShowWhatsapp(true);
    } else {
      setWhatsappNumber('');
      setShowWhatsapp(false);
    }
    setSelectedContactIndex(null);
    setDeviceContactsModalVisible(false);
    setDeviceContactsSearch('');
  };

  // Edit presets
  const editMemoryId = route.params?.editMemoryId;
  const editFinanceId = route.params?.editFinanceId;

  // Sync route pre-sets and pre-fill for edit flow
  useEffect(() => {
    if (editMemoryId) {
      const mem = memories.find((m) => m.id === editMemoryId);
      if (mem) {
        setAmount(mem.amount.toString());
        setDate(new Date(mem.date));
        setNotes(mem.notes || '');
        setContactName(mem.contactName);
        setWhatsappNumber(mem.whatsappNumber || '');
        setShowWhatsapp(!!mem.whatsappNumber);
        setSelectedOccasion(mem.occasion);
        setType(mem.type);
        setLogMode('friends');
      }
    } else if (editFinanceId) {
      const fin = finances.find((f) => f.id === editFinanceId);
      if (fin) {
        setAmount(fin.amount.toString());
        setDate(new Date(fin.date));
        setNotes(fin.notes || '');
        setFinTitle(fin.title);
        setFinType(fin.type);
        setFinCategory(fin.category);
        setLogMode('personal');
      }
    } else {
      if (route.params?.type) {
        if (route.params.type === 'income' || route.params.type === 'expense') {
          setFinType(route.params.type);
          setLogMode('personal');
        } else {
          setType(route.params.type);
          setLogMode('friends');
        }
      }
      if (route.params?.mode) {
        setLogMode(route.params.mode);
      }
    }
  }, [route.params?.type, route.params?.mode, editMemoryId, editFinanceId, memories, finances]);

  // Extract unique contacts from previous memories
  const uniqueContacts = Array.from(new Set(memories.map((m) => m.contactName))).map(
    (name) => {
      const record = memories.find((m) => m.contactName === name);
      return {
        name,
        whatsappNumber: record?.whatsappNumber || '',
        avatarIdx: record ? memories.indexOf(record) % 6 : 0,
      };
    }
  );

  // Handle Contact selection
  const handleSelectContact = (contact: typeof uniqueContacts[0], idx: number) => {
    setContactName(contact.name);
    setWhatsappNumber(contact.whatsappNumber);
    if (contact.whatsappNumber) setShowWhatsapp(true);
    setSelectedContactIndex(idx);
  };

  const handleLog = async () => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount greater than 0.');
      return;
    }

    const dateStr = date.toISOString().split('T')[0];

    if (logMode === 'friends') {
      // Friends & Family logging
      if (!contactName.trim()) {
        Alert.alert('Validation Error', 'Please select or enter a contact name.');
        return;
      }

      if (showWhatsapp && whatsappNumber) {
        const cleanPhone = whatsappNumber.replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
          Alert.alert('Validation Error', 'Please enter a valid 10-digit Indian WhatsApp number.');
          return;
        }
      }

      const occasion = selectedOccasion === 'Custom' ? customOccasion : selectedOccasion;
      if (selectedOccasion === 'Custom' && !customOccasion.trim()) {
        Alert.alert('Validation Error', 'Please enter your custom occasion.');
        return;
      }

      const payload = {
        contactName: contactName.trim(),
        whatsappNumber: showWhatsapp ? whatsappNumber.trim() : '',
        amount: numericAmount,
        occasion,
        date: dateStr,
        type,
        status: 'pending' as const,
        notes: notes.trim(),
      };

      if (editMemoryId) {
        await updateMemory(editMemoryId, payload);
        Alert.alert('Success', '✅ Record updated!');
      } else {
        await addMemory(payload);
      }
      
      // Clear Form
      setContactName('');
      setWhatsappNumber('');
      setShowWhatsapp(false);
      setSelectedOccasion('Dinner');
      setCustomOccasion('');
      setSelectedContactIndex(null);
    } else {
      // Personal Finance logging
      if (!finTitle.trim()) {
        Alert.alert('Validation Error', 'Please enter a title or source.');
        return;
      }

      const payload = {
        title: finTitle.trim(),
        amount: numericAmount,
        category: finCategory,
        type: finType,
        date: dateStr,
        notes: notes.trim() || undefined,
      };

      if (editFinanceId) {
        await updateFinance(editFinanceId, payload);
        Alert.alert('Success', '✅ Record updated!');
      } else {
        await addFinance(payload);
      }

      // Clear Form
      setFinTitle('');
    }

    // Common resets
    setAmount('');
    setDate(new Date());
    setNotes('');

    // Navigate back if editing, or to Dashboard if adding
    if (editMemoryId || editFinanceId) {
      navigation.goBack();
    } else {
      navigation.navigate('Dashboard');
    }
  };

  return (
    <ScrollView style={s.root} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={s.hdr}>
        <TouchableOpacity style={s.back} onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color={COLORS.text} />
          <Text style={s.ttl}>Log Entry</Text>
        </TouchableOpacity>
        {logMode === 'friends' && (
          <TouchableOpacity onPress={() => setContactsModalVisible(true)}>
            <Icon name="search-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Mode Switcher Tab */}
      <View style={s.modeSelector}>
        <TouchableOpacity
          style={[s.modeBtn, logMode === 'friends' && s.modeBtnActive]}
          onPress={() => setLogMode('friends')}
        >
          <Icon 
            name="people-outline" 
            size={16} 
            color={logMode === 'friends' ? COLORS.white : COLORS.gray} 
          />
          <Text style={[s.modeBtnText, logMode === 'friends' && s.modeBtnTextActive]}>
            Friends & Family
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.modeBtn, logMode === 'personal' && s.modeBtnActive]}
          onPress={() => setLogMode('personal')}
        >
          <Icon 
            name="cash-outline" 
            size={16} 
            color={logMode === 'personal' ? COLORS.white : COLORS.gray} 
          />
          <Text style={[s.modeBtnText, logMode === 'personal' && s.modeBtnTextActive]}>
            Personal Finance
          </Text>
        </TouchableOpacity>
      </View>

      {logMode === 'friends' ? (
        <>
          {/* Contact Picker Section */}
          <View style={s.sh}>
            <Text style={s.st}>Contact Picker</Text>
            <TouchableOpacity onPress={() => setContactsModalVisible(true)}>
              <Text style={s.va}>View all</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
            {uniqueContacts.map((c, idx) => (
              <TouchableOpacity
                key={c.name}
                style={s.pi}
                onPress={() => handleSelectContact(c, idx)}
              >
                <View style={[s.ac, selectedContactIndex === idx && s.as]}>
                  <Avatar type={getAvatarType(c.avatarIdx)} size={52} />
                </View>
                <Text style={s.pn}>{c.name}</Text>
              </TouchableOpacity>
            ))}

            {/* Custom "New Contact" option */}
            <TouchableOpacity
              style={s.pi}
              onPress={() => {
                setContactName('');
                setWhatsappNumber('');
                setShowWhatsapp(false);
                setSelectedContactIndex(null);
              }}
            >
              <View style={[s.ac, selectedContactIndex === null && s.as, s.addNewBtn]}>
                <Icon name="add" size={24} color={COLORS.primary} />
              </View>
              <Text style={s.pn}>New</Text>
            </TouchableOpacity>

            {/* Pick from Device Contacts Option (ADD - Auto Pick Contacts) */}
            <TouchableOpacity
              style={s.pi}
              onPress={loadDeviceContacts}
            >
              <View style={[s.ac, s.deviceContactBtn]}>
                {loadingContacts ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Icon name="people" size={22} color={COLORS.success} />
                )}
              </View>
              <Text style={s.pn}>Import</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Custom Contact Name Input */}
          {selectedContactIndex === null && (
            <View style={s.inputContainer}>
              <Text style={s.il}>Contact Name</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {contactName.trim().length > 0 && (
                  <View style={{ shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 2 }}>
                    <Avatar type={getAvatarType(contactName.length)} size={48} />
                  </View>
                )}
                <TextInput
                  style={[s.textInput, { flex: 1 }]}
                  placeholder="Type name manually"
                  placeholderTextColor={COLORS.gray}
                  value={contactName}
                  onChangeText={setContactName}
                />
              </View>
            </View>
          )}
        </>
      ) : (
        <>
          {/* PERSONAL FINANCE TRACK FORM */}
          {/* Type Toggle: Income vs Expense */}
          <View style={s.toggleRow}>
            <Text style={s.il}>Finance Mode</Text>
            <View style={s.typeSelector}>
              <TouchableOpacity
                style={[s.typeBtn, finType === 'income' && s.typeBtnActiveInc]}
                onPress={() => {
                  setFinType('income');
                  setFinCategory('Salary');
                }}
              >
                <Text style={[s.typeText, finType === 'income' && s.typeTextActiveInc]}>Income</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.typeBtn, finType === 'expense' && s.typeBtnActiveExp]}
                onPress={() => {
                  setFinType('expense');
                  setFinCategory('Food');
                }}
              >
                <Text style={[s.typeText, finType === 'expense' && s.typeTextActiveExp]}>Expense</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Title Input */}
          <View style={s.inputContainer}>
            <Text style={s.il}>Title / Source</Text>
            <TextInput
              style={s.textInput}
              placeholder={finType === 'income' ? 'e.g. Salary, Freelance project' : 'e.g. Rent, Food, Shopping'}
              placeholderTextColor={COLORS.gray}
              value={finTitle}
              onChangeText={setFinTitle}
            />
          </View>
        </>
      )}

      {/* Amount Input (Shared) */}
      <Text style={s.il}>Enter Amount</Text>
      <View style={s.ic}>
        <Text style={s.cs}>{preferences.currency}</Text>
        <TextInput
          style={s.ai}
          placeholder="0.00"
          placeholderTextColor={COLORS.gray}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />
      </View>

      {logMode === 'friends' ? (
        <>
          {/* Occasion Tags */}
          <Text style={s.il}>Occasion</Text>
          <View style={s.tr}>
            {['Dinner', 'Trip', 'Birthday', 'Loan', 'Gift', 'Custom'].map((t) => (
              <TouchableOpacity
                key={t}
                style={[s.tg, selectedOccasion === t && s.ta]}
                onPress={() => setSelectedOccasion(t)}
              >
                <Text style={[s.tt, selectedOccasion === t && s.tta]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedOccasion === 'Custom' && (
            <View style={s.inputContainer}>
              <TextInput
                style={s.textInput}
                placeholder="Specify custom occasion"
                placeholderTextColor={COLORS.gray}
                value={customOccasion}
                onChangeText={setCustomOccasion}
              />
            </View>
          )}

          {/* Type Toggle: Gave / Received */}
          <View style={s.toggleRow}>
            <Text style={s.il}>Lending Type</Text>
            <View style={s.typeSelector}>
              <TouchableOpacity
                style={[s.typeBtn, type === 'gave' && s.typeBtnActive]}
                onPress={() => setType('gave')}
              >
                <Text style={[s.typeText, type === 'gave' && s.typeTextActive]}>Gave</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.typeBtn, type === 'received' && s.typeBtnActive]}
                onPress={() => setType('received')}
              >
                <Text style={[s.typeText, type === 'received' && s.typeTextActive]}>Received</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* WhatsApp reminders option */}
          <View style={s.toggleRow}>
            <Text style={s.il}>WhatsApp Reminders</Text>
            <Switch
              value={showWhatsapp}
              onValueChange={setShowWhatsapp}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          {showWhatsapp && (
            <View style={s.inputContainer}>
              <Text style={s.il}>WhatsApp Number</Text>
              <TextInput
                style={s.textInput}
                placeholder="Enter 10-digit number"
                placeholderTextColor={COLORS.gray}
                value={whatsappNumber}
                onChangeText={setWhatsappNumber}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          )}
        </>
      ) : (
        <>
          {/* Category Chips Selector */}
          <Text style={s.il}>Category</Text>
          <View style={[s.tr, { marginTop: 8, marginBottom: 24 }]}>
            {(finType === 'income' 
              ? ['Salary', 'Freelance', 'Business', 'Other'] 
              : ['Rent', 'Food', 'Travel', 'Bills', 'Shopping', 'Entertainment', 'Other']
            ).map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setFinCategory(cat)}
                style={[s.tg, finCategory === cat && s.ta]}
              >
                <Text style={[s.tt, finCategory === cat && s.tta]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Date Picker (Shared) */}
      <View style={s.toggleRow}>
        <Text style={s.il}>Date</Text>
        <TouchableOpacity style={s.dateBtn} onPress={() => setShowDatePicker(true)}>
          <Text style={s.dateBtnText}>{date.toLocaleDateString()}</Text>
          <Icon name="calendar-outline" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}

      {/* Notes optional field (Shared) */}
      <View style={s.inputContainer}>
        <Text style={s.il}>Notes (Optional)</Text>
        <TextInput
          style={[s.textInput, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Add memo, details or memories..."
          placeholderTextColor={COLORS.gray}
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </View>

      {/* Action Button */}
      <TouchableOpacity style={s.sb} onPress={handleLog}>
        <Text style={s.sbt}>
          {editMemoryId ? 'Update Memory' : editFinanceId ? 'Update Finance Entry' : logMode === 'friends' ? 'Log Money Memory' : 'Add Finance Entry'}
        </Text>
      </TouchableOpacity>

      {/* Modal: View All Contacts */}
      <Modal visible={contactsModalVisible} animationType="slide" transparent>
        <View style={s.modalRoot}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>All Contacts</Text>
              <TouchableOpacity onPress={() => setContactsModalVisible(false)}>
                <Icon name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={uniqueContacts}
              keyExtractor={(item) => item.name}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', marginTop: 20, color: COLORS.gray }}>
                  No contacts found. Log a transaction first!
                </Text>
              }
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={s.contactRow}
                  onPress={() => {
                    handleSelectContact(item, index);
                    setContactsModalVisible(false);
                  }}
                >
                  <Avatar type={getAvatarType(item.avatarIdx)} size={40} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={s.rn}>{item.name}</Text>
                    {item.whatsappNumber !== '' && (
                      <Text style={s.rt}>WhatsApp: {item.whatsappNumber}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Modal: Pick Native Device Contacts (ADD - Auto Pick Contacts) */}
      <Modal visible={deviceContactsModalVisible} animationType="slide" transparent>
        <View style={s.modalRoot}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Device Contacts</Text>
              <TouchableOpacity onPress={() => setDeviceContactsModalVisible(false)}>
                <Icon name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Search Bar for Device Contacts */}
            <View style={s.deviceSearchContainer}>
              <Icon name="search-outline" size={18} color={COLORS.gray} />
              <TextInput
                placeholder="Search phone contacts..."
                value={deviceContactsSearch}
                onChangeText={setDeviceContactsSearch}
                style={s.deviceSearchInput}
                placeholderTextColor={COLORS.gray}
              />
              {deviceContactsSearch.length > 0 && (
                <TouchableOpacity onPress={() => setDeviceContactsSearch('')}>
                  <Icon name="close-circle" size={18} color={COLORS.gray} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredDeviceContacts}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', marginTop: 20, color: COLORS.gray }}>
                  No matching phone contacts.
                </Text>
              }
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={s.contactRow}
                  onPress={() => handleSelectDeviceContact(item)}
                >
                  <Avatar type={getAvatarType(index % 6)} size={40} />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={s.rn}>{item.name}</Text>
                    {item.phoneNumber ? (
                      <Text style={s.rt}>📞 {item.phoneNumber}</Text>
                    ) : (
                      <Text style={s.rt}>No number</Text>
                    )}
                  </View>
                  <Icon name="chevron-forward" size={18} color={COLORS.gray} />
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white, padding: 20, paddingTop: 50 },
  hdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  back: { flexDirection: 'row', alignItems: 'center' },
  ttl: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginLeft: 8 },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.grayLight,
    borderRadius: 24,
    padding: 4,
    marginBottom: 24,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    gap: 8,
  },
  modeBtnActive: {
    backgroundColor: COLORS.secondary,
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
  },
  modeBtnTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  sh: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  st: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  va: { color: COLORS.gray, fontSize: 12 },
  pi: { alignItems: 'center', marginRight: 16 },
  ac: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 8, overflow: 'hidden' },
  as: { borderWidth: 3, borderColor: COLORS.primary },
  pn: { fontSize: 12, fontWeight: '500', color: COLORS.text },
  il: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  ic: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cs: { fontSize: 32, fontWeight: '400', color: COLORS.text, marginRight: 8 },
  ai: { fontSize: 42, fontWeight: '800', color: COLORS.text, flex: 1, paddingVertical: 10 },
  tr: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24, gap: 8 },
  tg: { backgroundColor: COLORS.warningSoft, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  ta: { backgroundColor: COLORS.primary },
  tt: { color: COLORS.warningText, fontWeight: '600', fontSize: 12 },
  tta: { color: COLORS.white },
  sb: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 24, alignItems: 'center', marginBottom: 32 },
  sbt: { color: COLORS.secondary, fontSize: 16, fontWeight: '700' },
  addNewBtn: {
    backgroundColor: COLORS.warningSoft,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  inputContainer: {
    marginBottom: 20,
    gap: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
    padding: 3,
  },
  typeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 9,
  },
  typeBtnActive: {
    backgroundColor: COLORS.primary,
  },
  typeBtnActiveInc: {
    backgroundColor: '#E8F5E9',
  },
  typeBtnActiveExp: {
    backgroundColor: '#FFEBEE',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
  },
  typeTextActive: {
    color: COLORS.white,
  },
  typeTextActiveInc: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  typeTextActiveExp: {
    color: '#C62828',
    fontWeight: '700',
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  dateBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
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
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rn: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  rt: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  deviceContactBtn: {
    backgroundColor: '#E8F5E9',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  deviceSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.grayLight,
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 16,
    gap: 8,
  },
  deviceSearchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
});
