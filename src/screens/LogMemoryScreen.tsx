import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { Avatar, getAvatarType } from '../components/Avatar';

export const LogMemoryScreen = ({ navigation }: any) => {
  const contacts = [
    {name: 'Rimi', idx: 1, sel: true},
    {name: 'Zachary', idx: 0, sel: false},
    {name: 'Anne', idx: 4, sel: false},
    {name: 'Noah', idx: 5, sel: false},
    {name: 'Lucas', idx: 2, sel: false},
  ];
  const memories = [
    {name: 'Rimi Sharma', type: 'Dinner', amt: '-₹750.00', time: 'Today, 10:30 AM', idx: 1},
    {name: 'Zachary D.', type: 'Trip', amt: '-₹1,250.00', time: 'Yesterday, 6:20 PM', idx: 0},
    {name: 'Anne Joseph', type: 'Birthday', amt: '₹500.00', time: '21 Sep, 2025', idx: 4},
    {name: 'Noah Wilson', type: 'Movie', amt: '-₹350.00', time: '20 Sep, 2025', idx: 5},
  ];

  return (
    <ScrollView style={s.root} showsVerticalScrollIndicator={false}>
      <View style={s.hdr}><View style={s.back}><Icon name="chevron-back" size={24} color={COLORS.text} /><Text style={s.ttl}>Log Memory</Text></View><Icon name="search-outline" size={24} color={COLORS.text} /></View>
      <View style={s.sh}><Text style={s.st}>Contact Picker</Text><Text style={s.va}>View all</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:24}}>
        {contacts.map(c=><View key={c.name} style={s.pi}><View style={[s.ac,c.sel&&s.as]}><Avatar type={getAvatarType(c.idx)} size={52}/></View><Text style={s.pn}>{c.name}</Text></View>)}
      </ScrollView>
      <Text style={s.il}>Enter Amount</Text>
      <View style={s.ic}><Text style={s.cs}>₹</Text><TextInput style={s.ai} value="1200" keyboardType="numeric"/></View>
      <Text style={s.il}>Occasion</Text>
      <View style={s.tr}>{['Dinner','Trip','Birthday','Loan','Gift'].map((t,i)=><View key={t} style={[s.tg,i===0&&s.ta]}><Text style={[s.tt,i===0&&s.tta]}>{t}</Text></View>)}</View>
      <TouchableOpacity style={s.sb}><Text style={s.sbt}>Log Memory</Text></TouchableOpacity>
      <View style={s.sh}><Text style={s.st}>Recent Memories</Text><Text style={s.va}>View all</Text></View>
      {memories.map((m,i)=><View key={i} style={s.rr}><Avatar type={getAvatarType(m.idx)} size={40}/><View style={s.ri}><Text style={s.rn}>{m.name}</Text><Text style={s.rt}>{m.type}</Text></View><View style={s.rg}><Text style={s.ra}>{m.amt}</Text><Text style={s.rm}>{m.time}</Text></View></View>)}
      <View style={{height:100}}/>
    </ScrollView>
  );
};

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.white,padding:20,paddingTop:50},
  hdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:24},
  back:{flexDirection:'row',alignItems:'center'},
  ttl:{fontSize:20,fontWeight:'800',color:COLORS.text,marginLeft:8},
  sh:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16},
  st:{fontSize:16,fontWeight:'700',color:COLORS.text},
  va:{color:COLORS.gray,fontSize:12},
  pi:{alignItems:'center',marginRight:16},
  ac:{width:60,height:60,borderRadius:30,justifyContent:'center',alignItems:'center',marginBottom:8,overflow:'hidden'},
  as:{borderWidth:3,borderColor:COLORS.primary},
  pn:{fontSize:12,fontWeight:'500',color:COLORS.text},
  il:{fontSize:14,fontWeight:'600',color:COLORS.text,marginBottom:8},
  ic:{flexDirection:'row',alignItems:'center',marginBottom:24},
  cs:{fontSize:32,fontWeight:'400',color:COLORS.text,marginRight:8},
  ai:{fontSize:42,fontWeight:'800',color:COLORS.text,flex:1},
  tr:{flexDirection:'row',flexWrap:'wrap',marginBottom:24,gap:8},
  tg:{backgroundColor:COLORS.warningSoft,paddingHorizontal:16,paddingVertical:8,borderRadius:16},
  ta:{backgroundColor:COLORS.primary},
  tt:{color:COLORS.warningText,fontWeight:'600',fontSize:12},
  tta:{color:COLORS.white},
  sb:{backgroundColor:COLORS.primary,paddingVertical:16,borderRadius:24,alignItems:'center',marginBottom:32},
  sbt:{color:COLORS.secondary,fontSize:16,fontWeight:'700'},
  rr:{flexDirection:'row',alignItems:'center',paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border},
  ri:{flex:1,marginLeft:12},
  rn:{fontSize:14,fontWeight:'600',color:COLORS.text},
  rt:{fontSize:12,color:COLORS.gray,marginTop:2},
  rg:{alignItems:'flex-end'},
  ra:{fontSize:14,fontWeight:'700',color:COLORS.text},
  rm:{fontSize:10,color:COLORS.gray,marginTop:2},
});
