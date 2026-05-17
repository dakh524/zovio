import React from 'react';
import { Image, ImageSourcePropType, SafeAreaView, StyleSheet, View } from 'react-native';
import { COLORS } from '../constants/theme';

export const MockScreen = ({ source }: { source: ImageSourcePropType }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Image source={source} style={styles.image} resizeMode="contain" />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  inner: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
