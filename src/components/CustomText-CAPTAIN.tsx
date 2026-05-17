import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';

interface CustomTextProps extends TextProps {
  variant?: 'heading' | 'body' | 'bodyBold';
  size?: number;
  color?: string;
}

export const CustomText: React.FC<CustomTextProps> = ({ 
  children, 
  variant = 'body', 
  size = 14, 
  color = '#111827', 
  style, 
  ...props 
}) => {
  const getFontFamily = () => {
    switch(variant) {
      case 'heading': return 'Inter_700Bold';
      case 'bodyBold': return 'Inter_600SemiBold';
      default: return 'Inter_400Regular';
    }
  };

  return (
    <Text 
      style={[
        { fontFamily: getFontFamily(), fontSize: size, color: color },
        style
      ]} 
      {...props}
    >
      {children}
    </Text>
  );
};
