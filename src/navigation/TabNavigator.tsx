import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons as Icon } from '@expo/vector-icons';

import { DashboardScreen } from '../screens/DashboardScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { LogMemoryScreen } from '../screens/LogMemoryScreen';
import { MoneyNotesScreen } from '../screens/MoneyNotesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { COLORS } from '../constants/theme';

const Tab = createBottomTabNavigator();

export const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: {
          height: 80,
          paddingBottom: 15,
          paddingTop: 10,
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          elevation: 0,
        },
        tabBarLabel: ({ focused, color }) => {
          let label = route.name;
          if (route.name === 'LogMemory') label = 'Log Memory';
          if (route.name === 'MoneyNotes') label = 'Money Notes';
          
          return (
            <Text style={{ 
              color: focused ? COLORS.primary : COLORS.gray, 
              fontSize: 10, 
              fontWeight: '600',
              marginTop: 4 
            }}>
              {label}
            </Text>
          );
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof Icon.glyphMap = 'home';

          if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
          if (route.name === 'Analytics') iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          if (route.name === 'LogMemory') {
            // Special styling for Log Memory
            return (
              <View style={styles.logMemoryIconContainer}>
                <Icon name="paper-plane" size={20} color={COLORS.white} />
              </View>
            );
          }
          if (route.name === 'MoneyNotes') iconName = focused ? 'document-text' : 'document-text-outline';
          if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';

          return <Icon name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="LogMemory" component={LogMemoryScreen} />
      <Tab.Screen name="MoneyNotes" component={MoneyNotesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  logMemoryIconContainer: {
    backgroundColor: COLORS.primary,
    width: 44,
    height: 32,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -4,
  }
});
