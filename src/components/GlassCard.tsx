import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { COLORS } from '../constants/theme';

interface GlassCardProps extends ViewProps {
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, style, ...props }) => {
  return (
    <View style={[styles.container, style]} {...props}>
      <View style={styles.inner}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  inner: {
    padding: 20,
  },
});
