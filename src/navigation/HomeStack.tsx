import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { DashboardScreen } from '../screens/DashboardScreen';
import { LogMemoryScreen } from '../screens/LogMemoryScreen';

const Stack = createStackNavigator();

export const HomeStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardMain" component={DashboardScreen} />
      <Stack.Screen name="LogMemory" component={LogMemoryScreen} />
    </Stack.Navigator>
  );
};
