import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import Svg, { Circle, Path, Ellipse, G, Rect } from 'react-native-svg';
import { COLORS } from '../constants/theme';

// Navy blue (#0B132B) and white illustration style avatars on yellow background
// Matching the exact reference image style

type AvatarType = 'manGlasses' | 'womanBun' | 'manBeardBun' | 'womanDark' | 'womanBob' | 'manBeard' | 'avatar1' | 'avatar2' | string;

interface AvatarProps {
  type: AvatarType;
  size?: number;
  showBackground?: boolean;
}

const NAVY = '#0B132B';
const BLUE = '#3B5998';
const SKIN = '#F7E0C4';
const YELLOW_BG = '#F5C518';

// Man with glasses - top left of reference
const ManGlasses = ({ s }: { s: number }) => (
  <Svg width={s} height={s} viewBox="0 0 100 100">
    <Circle cx="50" cy="50" r="50" fill={YELLOW_BG} />
    {/* Neck */}
    <Rect x="40" y="68" width="20" height="12" fill={SKIN} />
    {/* Shirt/sweater */}
    <Path d="M25,100 Q25,78 50,78 Q75,78 75,100" fill="#E8DCC8" />
    <Path d="M42,78 L42,85 Q50,90 58,85 L58,78" fill={BLUE} />
    {/* Face */}
    <Ellipse cx="50" cy="48" rx="20" ry="24" fill={SKIN} />
    {/* Hair - spiky */}
    <Path d="M30,42 Q28,20 40,18 Q45,10 50,16 Q55,8 60,16 Q65,10 68,20 Q75,22 72,42" fill={NAVY} />
    {/* Glasses */}
    <Circle cx="42" cy="46" r="7" fill="none" stroke={NAVY} strokeWidth="2" />
    <Circle cx="58" cy="46" r="7" fill="none" stroke={NAVY} strokeWidth="2" />
    <Path d="M49,46 L51,46" stroke={NAVY} strokeWidth="2" />
    <Path d="M35,44 L30,42" stroke={NAVY} strokeWidth="2" />
    {/* Eyes */}
    <Circle cx="42" cy="46" r="2" fill={NAVY} />
    <Circle cx="58" cy="46" r="2" fill={NAVY} />
    {/* Nose */}
    <Path d="M50,50 Q52,54 50,56" fill="none" stroke={NAVY} strokeWidth="1" />
    {/* Smile */}
    <Path d="M44,58 Q50,64 56,58" fill="none" stroke={NAVY} strokeWidth="1.5" />
  </Svg>
);

// Woman with bun - top center
const WomanBun = ({ s }: { s: number }) => (
  <Svg width={s} height={s} viewBox="0 0 100 100">
    <Circle cx="50" cy="50" r="50" fill={YELLOW_BG} />
    {/* Neck */}
    <Rect x="42" y="66" width="16" height="12" fill={SKIN} />
    {/* Jacket */}
    <Path d="M25,100 Q25,78 50,76 Q75,78 75,100" fill={NAVY} />
    <Path d="M40,76 L40,90" stroke="white" strokeWidth="1" />
    <Path d="M50,82 L55,82" stroke="white" strokeWidth="1" />
    <Circle cx="42" cy="84" r="2" fill="white" />
    <Circle cx="42" cy="90" r="2" fill="white" />
    {/* Turtleneck */}
    <Path d="M42,72 Q50,70 58,72 L58,78 Q50,76 42,78 Z" fill={YELLOW_BG} />
    {/* Face */}
    <Ellipse cx="50" cy="48" rx="18" ry="22" fill={SKIN} />
    {/* Hair */}
    <Path d="M32,46 Q28,22 42,18 Q50,14 58,18 Q72,22 68,46" fill={NAVY} />
    {/* Bun */}
    <Circle cx="58" cy="18" r="10" fill={NAVY} />
    {/* Eyes */}
    <Circle cx="43" cy="46" r="2" fill={NAVY} />
    <Circle cx="57" cy="46" r="2" fill={NAVY} />
    {/* Nose */}
    <Path d="M50,50 Q52,53 50,55" fill="none" stroke={NAVY} strokeWidth="1" />
    {/* Lips */}
    <Path d="M45,58 Q50,62 55,58" fill="none" stroke="#E06060" strokeWidth="1.5" />
    {/* Earring */}
    <Circle cx="32" cy="52" r="3" fill={YELLOW_BG} stroke={NAVY} strokeWidth="1" />
  </Svg>
);

// Man with beard and man-bun - top right
const ManBeardBun = ({ s }: { s: number }) => (
  <Svg width={s} height={s} viewBox="0 0 100 100">
    <Circle cx="50" cy="50" r="50" fill={YELLOW_BG} />
    {/* Neck */}
    <Rect x="40" y="66" width="20" height="12" fill={SKIN} />
    {/* Shirt */}
    <Path d="M25,100 Q25,78 50,76 Q75,78 75,100" fill={BLUE} />
    <Path d="M45,76 L50,82 L55,76" fill="none" stroke={NAVY} strokeWidth="1" />
    {/* Face */}
    <Ellipse cx="50" cy="48" rx="20" ry="24" fill={SKIN} />
    {/* Beard */}
    <Path d="M32,52 Q32,72 50,72 Q68,72 68,52" fill={NAVY} />
    {/* Hair */}
    <Path d="M30,44 Q28,20 42,16 Q50,12 58,16 Q72,20 70,44" fill={NAVY} />
    {/* Man bun */}
    <Circle cx="55" cy="14" r="8" fill={NAVY} />
    {/* Eyes - closed/smiling */}
    <Path d="M40,44 Q43,42 46,44" fill="none" stroke="white" strokeWidth="2" />
    <Path d="M54,44 Q57,42 60,44" fill="none" stroke="white" strokeWidth="2" />
    {/* Smile through beard */}
    <Path d="M42,58 Q50,64 58,58" fill="none" stroke="white" strokeWidth="1.5" />
    {/* Earring */}
    <Circle cx="30" cy="50" r="3" fill={YELLOW_BG} />
  </Svg>
);

// Woman dark skin with bun - bottom left
const WomanDark = ({ s }: { s: number }) => (
  <Svg width={s} height={s} viewBox="0 0 100 100">
    <Circle cx="50" cy="50" r="50" fill={YELLOW_BG} />
    {/* Neck */}
    <Rect x="42" y="66" width="16" height="12" fill="#6B4226" />
    {/* Blazer */}
    <Path d="M25,100 Q25,78 50,76 Q75,78 75,100" fill={NAVY} />
    {/* White t-shirt */}
    <Path d="M38,78 Q50,74 62,78 L60,90 Q50,86 40,90 Z" fill="white" />
    {/* Face */}
    <Ellipse cx="50" cy="48" rx="18" ry="22" fill="#6B4226" />
    {/* Hair */}
    <Path d="M32,46 Q28,22 42,16 Q50,12 58,16 Q72,22 68,46" fill={NAVY} />
    {/* Bun */}
    <Circle cx="40" cy="16" r="10" fill={NAVY} />
    {/* Eyes */}
    <Circle cx="43" cy="46" r="2" fill="white" />
    <Circle cx="57" cy="46" r="2" fill="white" />
    {/* Nose */}
    <Path d="M50,50 Q52,53 50,55" fill="none" stroke={NAVY} strokeWidth="1" />
    {/* Lips */}
    <Path d="M45,58 Q50,62 55,58" fill={BLUE} />
    {/* Earring */}
    <Circle cx="32" cy="54" r="3" fill={YELLOW_BG} stroke={NAVY} strokeWidth="1" />
  </Svg>
);

// Woman with bob hair - bottom center
const WomanBob = ({ s }: { s: number }) => (
  <Svg width={s} height={s} viewBox="0 0 100 100">
    <Circle cx="50" cy="50" r="50" fill={YELLOW_BG} />
    {/* Neck */}
    <Rect x="43" y="66" width="14" height="12" fill={SKIN} />
    {/* Top */}
    <Path d="M30,100 Q30,78 50,76 Q70,78 70,100" fill="white" />
    {/* Face */}
    <Ellipse cx="50" cy="48" rx="18" ry="22" fill={SKIN} />
    {/* Bob hair */}
    <Path d="M28,44 Q26,18 42,14 Q50,10 58,14 Q74,18 72,44 Q72,60 65,64 L65,40 Q65,34 50,34 Q35,34 35,40 L35,64 Q28,60 28,44" fill={NAVY} />
    {/* Eyes - closed smiling */}
    <Path d="M40,46 Q43,44 46,46" fill="none" stroke={NAVY} strokeWidth="2" />
    <Path d="M54,46 Q57,44 60,46" fill="none" stroke={NAVY} strokeWidth="2" />
    {/* Nose */}
    <Path d="M50,50 Q52,53 50,55" fill="none" stroke={NAVY} strokeWidth="1" />
    {/* Smile */}
    <Path d="M44,58 Q50,64 56,58" fill="none" stroke={NAVY} strokeWidth="1.5" />
    {/* Earrings */}
    <Circle cx="34" cy="54" r="4" fill={YELLOW_BG} stroke={NAVY} strokeWidth="1" />
    <Circle cx="66" cy="54" r="4" fill={YELLOW_BG} stroke={NAVY} strokeWidth="1" />
  </Svg>
);

// Man with beard - bottom right
const ManBeard = ({ s }: { s: number }) => (
  <Svg width={s} height={s} viewBox="0 0 100 100">
    <Circle cx="50" cy="50" r="50" fill={YELLOW_BG} />
    {/* Neck */}
    <Rect x="40" y="66" width="20" height="12" fill={SKIN} />
    {/* Blazer */}
    <Path d="M22,100 Q22,78 50,74 Q78,78 78,100" fill={NAVY} />
    {/* White shirt collar */}
    <Path d="M42,74 L50,82 L58,74" fill="white" />
    {/* Arms crossed */}
    <Path d="M28,90 Q35,82 50,84 Q65,82 72,90" fill={NAVY} />
    {/* Face */}
    <Ellipse cx="50" cy="48" rx="20" ry="22" fill={SKIN} />
    {/* Beard */}
    <Path d="M34,54 Q34,68 50,70 Q66,68 66,54" fill={NAVY} />
    {/* Hair */}
    <Path d="M30,42 Q28,20 42,16 Q50,12 58,16 Q72,20 70,42" fill={NAVY} />
    {/* Eyes - closed smiling */}
    <Path d="M40,44 Q43,42 46,44" fill="none" stroke={NAVY} strokeWidth="2" />
    <Path d="M54,44 Q57,42 60,44" fill="none" stroke={NAVY} strokeWidth="2" />
    {/* Smile */}
    <Path d="M42,58 Q50,64 58,58" fill="none" stroke="white" strokeWidth="1.5" />
  </Svg>
);

const AVATAR_MAP: Record<AvatarType, React.FC<{s: number}>> = {
  manGlasses: ManGlasses,
  womanBun: WomanBun,
  manBeardBun: ManBeardBun,
  womanDark: WomanDark,
  womanBob: WomanBob,
  manBeard: ManBeard,
};

export const Avatar: React.FC<AvatarProps> = ({ type, size = 50, showBackground = true }) => {
  if (type === 'avatar1') {
    return (
      <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
        <Image source={require('../../assets/avatar1.png')} style={{ width: size, height: size, borderRadius: size / 2 }} />
      </View>
    );
  }
  if (type === 'avatar2') {
    return (
      <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
        <Image source={require('../../assets/avatar2.png')} style={{ width: size, height: size, borderRadius: size / 2 }} />
      </View>
    );
  }
  
  if (type.startsWith('http') || type.startsWith('file') || type.startsWith('content')) {
    return (
      <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
        <Image source={{ uri: type }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      </View>
    );
  }

  const AvatarComponent = AVATAR_MAP[type as any] || AVATAR_MAP['manBeard'];
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      <AvatarComponent s={size} />
    </View>
  );
};

// Helper to get avatar type by index
export const AVATAR_TYPES: AvatarType[] = ['avatar1', 'avatar2', 'manGlasses', 'womanBun', 'manBeardBun', 'womanDark', 'womanBob', 'manBeard'];

export const getAvatarType = (index: number): AvatarType => {
  return AVATAR_TYPES[index % AVATAR_TYPES.length];
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
