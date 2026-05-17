import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TabNavigator } from './TabNavigator';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { ProjectScreen } from '../screens/ProjectScreen';
import { storage } from '../store/storage';
import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants/theme';

const Stack = createStackNavigator();

export const AppNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<'Onboarding' | 'MainTabs'>('Onboarding');

  useEffect(() => {
    const checkOnboarding = async () => {
      const hasCompleted = await storage.hasCompletedOnboarding();
      if (hasCompleted) {
        setInitialRoute('MainTabs');
      }
      setIsLoading(false);
    };
    checkOnboarding();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="Project" component={ProjectScreen} />
    </Stack.Navigator>
  );
};
