import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { FONTS, COLORS } from '../constants/theme';

interface CustomTextProps extends TextProps {
  variant?: 'heading' | 'body' | 'bodyBold';
  color?: string;
  size?: number;
}

export const CustomText: React.FC<CustomTextProps> = ({
  variant = 'body',
  color = COLORS.text,
  size,
  style,
  ...props
}) => {
  const fontStyle = {
    fontFamily: FONTS[variant],
    color,
    fontSize: size || (variant === 'heading' ? 24 : 16),
  };

  return <Text style={[fontStyle, style]} {...props} />;
};
