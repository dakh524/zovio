import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { COLORS } from '../constants/theme';

export type AvatarVariant =
  | 'manSide'
  | 'womanBun'
  | 'manBun'
  | 'womanSilhouette'
  | 'womanBob'
  | 'manBeard';

type GenericAvatarProps = {
  name: string;
  size?: number;
  source?: ImageSourcePropType;
  variant?: AvatarVariant;
};

const NAVY = '#182A73';
const BLUE = '#4C67E6';
const GOLD = '#FFD44D';
const SKIN = '#FFF6EA';
const PEACH = '#F6B48C';

const variantByName = (name: string): AvatarVariant => {
  const variants: AvatarVariant[] = ['womanSilhouette', 'manSide', 'womanBun', 'womanBob', 'manBeard', 'manBun'];
  const value = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return variants[value % variants.length];
};

const IllustratedAvatar = ({ variant }: { variant: AvatarVariant }) => {
  switch (variant) {
    case 'manSide':
      return (
        <>
          <Circle cx="50" cy="50" r="50" fill={GOLD} />
          <Path d="M16 88 C18 70, 28 54, 46 48 C56 46, 64 48, 72 55 C81 63, 84 74, 84 92 L16 92 Z" fill={GOLD} />
          <Path d="M55 26 C69 28, 76 38, 75 53 C70 48, 62 45, 55 45 Z" fill={NAVY} />
          <Path d="M38 30 C47 21, 63 21, 72 31 C63 29, 54 31, 47 35 C42 39, 39 43, 38 50 C34 47, 32 42, 32 38 C32 35, 34 32, 38 30 Z" fill={NAVY} />
          <Path d="M36 54 C39 42, 49 35, 60 35 C64 35, 67 36, 71 38 C68 50, 61 60, 49 65 C43 64, 39 60, 36 54 Z" fill={SKIN} />
          <Path d="M62 44 C67 43, 71 44, 75 47" stroke={NAVY} strokeWidth="2.5" strokeLinecap="round" />
          <Circle cx="64" cy="46" r="1.8" fill={NAVY} />
          <Path d="M55 50 C58 52, 62 53, 66 53" stroke={NAVY} strokeWidth="2" strokeLinecap="round" />
          <Path d="M48 64 L60 64 L64 71 L52 71 Z" fill={BLUE} />
          <Path d="M24 94 C25 76, 29 64, 43 60 L52 92 L24 94 Z" fill={SKIN} />
          <Path d="M51 60 C61 60, 72 64, 79 76 L78 94 L51 94 Z" fill={NAVY} />
          <Path d="M43 60 C46 58, 49 58, 52 60 L52 94 L35 94 L31 76 Z" fill={GOLD} />
          <Path d="M52 60 C55 58, 58 58, 61 60 L79 76 L79 94 L52 94 Z" fill={BLUE} />
          <Path d="M40 45 C34 48, 31 54, 32 61" stroke={NAVY} strokeWidth="2.5" strokeLinecap="round" />
        </>
      );
    case 'womanBun':
      return (
        <>
          <Circle cx="50" cy="50" r="50" fill={GOLD} />
          <Path d="M20 92 C25 74, 34 62, 48 59 C65 56, 78 67, 81 92 Z" fill={NAVY} opacity="0.08" />
          <Circle cx="58" cy="24" r="11" fill={NAVY} />
          <Path d="M38 30 C44 23, 56 21, 65 26 C72 30, 76 38, 76 46 C70 41, 63 39, 57 39 C51 39, 43 41, 38 46 C35 42, 34 38, 34 35 C34 33, 35 31, 38 30 Z" fill={NAVY} />
          <Path d="M38 52 C41 42, 48 36, 57 36 C64 36, 70 40, 73 48 C70 60, 63 66, 54 67 C47 66, 41 61, 38 52 Z" fill={SKIN} />
          <Path d="M47 47 C49 46, 51 46, 53 47" stroke={NAVY} strokeWidth="2" strokeLinecap="round" />
          <Path d="M58 47 C60 46, 62 46, 64 47" stroke={NAVY} strokeWidth="2" strokeLinecap="round" />
          <Path d="M52 56 C55 58, 58 58, 61 56" stroke={PEACH} strokeWidth="2" strokeLinecap="round" />
          <Circle cx="43" cy="58" r="3.5" fill={GOLD} />
          <Circle cx="69" cy="57" r="3.5" fill={GOLD} />
          <Path d="M32 94 C35 78, 43 64, 54 62 C64 63, 72 71, 75 94 Z" fill={NAVY} />
          <Path d="M44 67 C48 63, 60 63, 64 67 L64 94 L44 94 Z" fill={GOLD} />
          <Path d="M32 72 L43 78 L40 94 L28 94 Z" fill={SKIN} />
          <Path d="M76 72 L68 78 L72 94 L84 94 Z" fill={SKIN} />
        </>
      );
    case 'manBun':
      return (
        <>
          <Circle cx="50" cy="50" r="50" fill={GOLD} />
          <Circle cx="58" cy="20" r="9" fill={NAVY} />
          <Path d="M37 30 C46 22, 61 23, 69 31 C73 35, 75 41, 74 46 C69 41, 62 38, 54 38 C48 38, 42 40, 37 44 C34 39, 34 33, 37 30 Z" fill={NAVY} />
          <Path d="M36 51 C39 42, 46 37, 54 37 C63 37, 70 43, 72 52 C70 61, 64 67, 56 69 C47 68, 40 61, 36 51 Z" fill={SKIN} />
          <Path d="M39 53 C43 66, 50 72, 60 73 C66 72, 71 68, 73 62 C72 78, 63 86, 50 86 C42 84, 37 79, 34 71 C33 65, 34 58, 39 53 Z" fill={NAVY} />
          <Path d="M44 47 C46 46, 48 46, 50 47" stroke={NAVY} strokeWidth="2" strokeLinecap="round" />
          <Path d="M56 47 C58 46, 60 46, 62 47" stroke={NAVY} strokeWidth="2" strokeLinecap="round" />
          <Path d="M26 94 C28 74, 38 62, 51 60 C64 61, 74 73, 76 94 Z" fill={BLUE} />
          <Rect x="44" y="59" width="14" height="9" rx="4" fill={SKIN} />
        </>
      );
    case 'womanSilhouette':
      return (
        <>
          <Circle cx="50" cy="50" r="50" fill={GOLD} />
          <Path d="M34 36 C40 27, 52 22, 63 26 C72 29, 78 37, 78 47 C72 44, 66 43, 60 44 C49 46, 41 52, 37 61 C33 56, 30 50, 30 44 C30 41, 31 39, 34 36 Z" fill={NAVY} />
          <Circle cx="65" cy="30" r="10" fill={NAVY} />
          <Path d="M38 52 C40 42, 47 36, 57 36 C63 36, 68 39, 72 44 C71 54, 67 61, 60 66 C52 65, 45 60, 38 52 Z" fill={NAVY} />
          <Circle cx="71" cy="57" r="4" fill={GOLD} />
          <Path d="M23 94 C25 76, 33 64, 45 61 C58 62, 67 72, 70 94 Z" fill={NAVY} />
          <Path d="M39 66 C43 63, 49 62, 55 63 L57 94 L38 94 Z" fill={SKIN} />
          <Path d="M35 67 C30 73, 26 81, 23 94 L13 94 C15 83, 22 72, 29 66 Z" fill={NAVY} />
        </>
      );
    case 'womanBob':
      return (
        <>
          <Circle cx="50" cy="50" r="50" fill={GOLD} />
          <Path d="M33 38 C39 28, 51 24, 61 27 C70 30, 76 38, 75 48 C70 44, 64 43, 57 43 C50 43, 43 45, 37 49 C34 46, 32 42, 32 39 C32 39, 32 38, 33 38 Z" fill={NAVY} />
          <Path d="M36 54 C39 43, 47 37, 57 37 C65 37, 71 42, 74 51 C71 62, 65 69, 57 70 C48 69, 41 63, 36 54 Z" fill={SKIN} />
          <Path d="M34 50 C35 66, 42 77, 57 81 C69 79, 76 69, 77 53 C74 61, 69 64, 64 66 C60 67, 56 67, 52 66 C46 64, 39 58, 34 50 Z" fill={NAVY} />
          <Circle cx="38" cy="60" r="4.2" fill={GOLD} />
          <Circle cx="72" cy="60" r="4.2" fill={GOLD} />
          <Path d="M27 94 C31 76, 39 65, 54 63 C68 65, 77 76, 80 94 Z" fill={SKIN} />
          <Path d="M25 94 C29 82, 34 72, 40 67 C44 71, 45 80, 45 94 Z" fill={NAVY} />
          <Path d="M66 67 C72 72, 77 82, 81 94 L64 94 C64 81, 66 72, 66 67 Z" fill={NAVY} />
        </>
      );
    case 'manBeard':
      return (
        <>
          <Circle cx="50" cy="50" r="50" fill={GOLD} />
          <Path d="M38 28 C47 21, 61 23, 69 30 C74 35, 77 42, 76 48 C69 43, 61 40, 54 40 C48 40, 43 42, 38 47 C35 43, 34 39, 34 35 C34 32, 35 30, 38 28 Z" fill={NAVY} />
          <Path d="M37 52 C40 42, 48 36, 57 36 C66 36, 72 42, 74 51 C71 60, 65 66, 57 68 C48 67, 41 61, 37 52 Z" fill={SKIN} />
          <Path d="M39 55 C45 67, 54 73, 66 74 C73 71, 76 66, 77 60 C78 77, 69 86, 54 86 C45 84, 38 78, 35 69 C34 64, 35 59, 39 55 Z" fill={NAVY} />
          <Path d="M44 47 C46 46, 48 46, 50 47" stroke={NAVY} strokeWidth="2" strokeLinecap="round" />
          <Path d="M57 47 C59 46, 61 46, 63 47" stroke={NAVY} strokeWidth="2" strokeLinecap="round" />
          <Path d="M24 94 C27 76, 36 64, 51 61 C66 63, 76 74, 79 94 Z" fill={NAVY} />
          <Path d="M46 65 C50 62, 60 62, 64 65 L64 94 L46 94 Z" fill={GOLD} />
          <Path d="M36 69 L30 94 L19 94 C21 84, 27 74, 33 67 Z" fill={NAVY} />
        </>
      );
    default:
      return null;
  }
};

export const GenericAvatar = ({ name, size = 40, source, variant }: GenericAvatarProps) => {
  const resolvedVariant = variant ?? variantByName(name);

  return (
    <View style={[styles.outer, { width: size, height: size, borderRadius: size / 2 }]}>
      {source ? (
        <Image source={source} style={[styles.image, { borderRadius: size / 2 }]} resizeMode="cover" />
      ) : (
        <View style={styles.container}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100">
            <IllustratedAvatar variant={resolvedVariant} />
          </Svg>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    backgroundColor: COLORS.white,
    padding: 2,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#FFE27B',
  },
});
