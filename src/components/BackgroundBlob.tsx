import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';

const { width } = Dimensions.get('window');

export const BackgroundBlob = () => {
  return (
    <View style={styles.container}>
      <Svg height="320" width={width} viewBox={`0 0 ${width} 320`}>
        <Defs>
          <LinearGradient id="blobGlow" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFE07A" stopOpacity="0.75" />
            <Stop offset="1" stopColor="#FFF5D6" stopOpacity="0.08" />
          </LinearGradient>
        </Defs>
        <Circle cx={width * 0.15} cy="58" r="84" fill="url(#blobGlow)" />
        <Circle cx={width * 0.82} cy="96" r="92" fill="url(#blobGlow)" opacity="0.6" />
        <Ellipse cx={width * 0.5} cy="40" rx={width * 0.48} ry="120" fill="#FFF6D9" opacity="0.9" />
        <Path
          d={`M0,0 L${width},0 L${width},150 C${width * 0.78},238 ${width * 0.24},102 0,198 Z`}
          fill="#FFE289"
          opacity="0.42"
        />
        <Path
          d={`M0,0 L${width},0 L${width},100 C${width * 0.64},170 ${width * 0.36},45 0,150 Z`}
          fill="#FFF0B8"
          opacity="0.7"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: -1,
  },
});
