import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Switch } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { Avatar } from '../components/Avatar';

export const ProfileScreen = () => {
  return (
    <ScrollView style={s.root} showsVerticalScrollIndicator={false}>
      <View style={s.hdr}><View style={{flex:1}}/><Icon name="settings-outline" size={24} color={COLORS.text}/></View>
      <View style={s.ps}>
        <View style={s.aw}><Avatar type="manBeard" size={120}/></View>
        <Text style={s.nm}>Sajibur Rahman</Text>
        <Text style={s.sub}>My Money Diary</Text>
      </View>
      <View style={s.sc}>
        <View style={s.col}><View style={s.si}><Icon name="arrow-up" size={16} color={COLORS.primary}/></View><Text style={s.sl}>Total Given</Text><Text style={s.sa}>₹28,450</Text></View>
        <View style={s.dv}/>
        <View style={s.col}><View style={s.si}><Icon name="arrow-down" size={16} color={COLORS.primary}/></View><Text style={s.sl}>Total Received</Text><Text style={s.sa}>₹34,890</Text></View>
        <View style={s.dv}/>
        <View style={s.col}><View style={s.si}><Icon name="checkmark" size={16} color={COLORS.primary}/></View><Text style={s.sl}>Total Settled</Text><Text style={s.sa}>₹22,760</Text></View>
      </View>
      <View style={s.ol}>
        <View style={s.or}><View style={s.ofl}><Icon name="logo-whatsapp" size={20} color={COLORS.success}/><Text style={s.ot}>WhatsApp Reminders</Text></View><Switch value={true} trackColor={{false:"#767577",true:COLORS.success}} thumbColor="#fff"/></View>
        <View style={s.or}><View style={s.ofl}><Icon name="notifications-outline" size={20} color={COLORS.gray}/><Text style={s.ot}>Notification Settings</Text></View><Icon name="chevron-forward" size={20} color={COLORS.gray}/></View>
        <View style={s.or}><View style={s.ofl}><Icon name="cash-outline" size={20} color={COLORS.gray}/><Text style={s.ot}>Currency Preference</Text></View><Icon name="chevron-forward" size={20} color={COLORS.gray}/></View>
        <View style={s.or}><View style={s.ofl}><Icon name="information-circle-outline" size={20} color={COLORS.gray}/><Text style={s.ot}>About Zovio</Text></View><Icon name="chevron-forward" size={20} color={COLORS.gray}/></View>
      </View>
      <View style={{height:100}}/>
    </ScrollView>
  );
};

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#FAFAFA',padding:20,paddingTop:50},
  hdr:{flexDirection:'row',justifyContent:'flex-end',marginBottom:20},
  ps:{alignItems:'center',marginBottom:32},
  aw:{width:140,height:140,borderRadius:70,justifyContent:'center',alignItems:'center',marginBottom:16,borderWidth:3,borderColor:COLORS.primary,overflow:'hidden'},
  nm:{fontSize:24,fontWeight:'800',color:COLORS.text},
  sub:{fontSize:14,color:COLORS.gray,marginTop:4},
  sc:{backgroundColor:COLORS.secondary,borderRadius:24,padding:20,flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:32},
  col:{alignItems:'center',flex:1},
  si:{width:32,height:32,borderRadius:16,borderWidth:1,borderColor:'rgba(255,255,255,0.2)',justifyContent:'center',alignItems:'center',marginBottom:8},
  sl:{fontSize:10,color:'rgba(255,255,255,0.7)',marginBottom:4},
  sa:{fontSize:16,fontWeight:'700',color:COLORS.white},
  dv:{width:1,height:40,backgroundColor:'rgba(255,255,255,0.1)'},
  ol:{backgroundColor:COLORS.white,borderRadius:24,padding:16},
  or:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:16,borderBottomWidth:1,borderBottomColor:COLORS.border},
  ofl:{flexDirection:'row',alignItems:'center',gap:12},
  ot:{fontSize:14,fontWeight:'500',color:COLORS.text},
});
