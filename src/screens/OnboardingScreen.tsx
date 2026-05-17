import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { Avatar, getAvatarType } from '../components/Avatar';
import Svg, { Path } from 'react-native-svg';
import { useZovio } from '../store/ZovioContext';

const { width, height } = Dimensions.get('window');

const ONBOARDING_DATA = [
  {
    title: 'ZOVIO',
    subtitle: 'Smart Money.\nSimple Life.',
    description: 'Track money you gave, received, and shared with friends & family - all in one beautiful place.',
    hasFeatures: false,
    isFirst: true,
  },
  {
    title: 'Money Is More\nThan Numbers',
    description: 'Log dinners, trips, birthday gifts, loans, and shared expenses with just one tap.',
    features: [
      { icon: 'checkmark-circle-outline', text: 'Quick amount entry' },
      { icon: 'pricetag-outline', text: 'Occasion tags' },
      { icon: 'people-outline', text: 'Contact-based tracking' },
    ],
    hasFeatures: true,
  },
  {
    title: 'Friendly Reminders\nThat Work',
    description: 'Send WhatsApp reminders instantly and keep track of pending payments without awkward conversations.',
    features: [
      { icon: 'notifications-outline', text: 'Smart reminders' },
      { icon: 'alert-circle-outline', text: 'Pending status badges' },
      { icon: 'checkmark-done-outline', text: 'Settlement tracking' },
    ],
    hasFeatures: true,
  },
  {
    title: 'Beautiful Insights\n& Analytics',
    description: 'See where your money flows with charts, trends, and monthly summaries designed for clarity.',
    features: [
      { icon: 'bar-chart-outline', text: 'Spending overview' },
      { icon: 'trending-up-outline', text: 'Expense trends' },
      { icon: 'document-text-outline', text: 'Quick insights cards' },
    ],
    hasFeatures: true,
  },
  {
    title: 'Everything Organized.\nForever.',
    description: 'Your personal money diary that helps you remember every shared moment and transaction.',
    hasFeatures: false,
    isLast: true,
  }
];

export const OnboardingScreen = () => {
  const navigation = useNavigation<any>();
  const { restoreSecureBackup } = useZovio();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const getOnboardingAvatar = (idx: number): string => {
    switch (idx) {
      case 0: return 'avatar3';
      case 1: return 'avatar2';
      case 2: return 'manGlasses';
      case 3: return 'womanBun';
      case 4: return 'manBeardBun';
      default: return 'avatar3';
    }
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    setCurrentIndex(index);
  };

  const goToSlide = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
  };

  const nextSlide = () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      goToSlide(currentIndex + 1);
    }
  };

  const finishOnboarding = async () => {
    const { storage } = require('../store/storage');
    await storage.setHasCompletedOnboarding(true);
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.pageIndicator}>Onboarding {currentIndex + 1}/5</Text>
        {currentIndex < ONBOARDING_DATA.length - 1 && (
          <TouchableOpacity onPress={finishOnboarding}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.scrollContainer}
      >
        {ONBOARDING_DATA.map((item, index) => (
          <View key={index} style={styles.slide}>
            <View style={styles.headerArea}>
              {item.isFirst ? (
                <>
                  <Text style={styles.logoTitle}>{item.title}</Text>
                  <Text style={styles.logoSubtitle}>{item.subtitle}</Text>
                </>
              ) : (
                <Text style={styles.slideTitle}>{item.title}</Text>
              )}
            </View>

            <View style={styles.illustrationWrap}>
              <Svg height={250} width={250} style={styles.blob} viewBox="0 0 200 200">
                <Path fill={COLORS.warningSoft} d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.1,-46.3C90.4,-33.5,96,-18.1,95.5,-2.9C95,12.3,88.4,27.3,78.2,38.8C68,50.3,54.2,58.3,40.1,65C26,71.7,11.6,77.1,-3.5,82.8C-18.6,88.5,-34.4,94.5,-48.6,90C-62.8,85.5,-75.4,70.5,-83.4,53.8C-91.4,37.1,-94.8,18.7,-91.6,1.8C-88.4,-15.1,-78.6,-30.5,-67.2,-43.2C-55.8,-55.9,-42.8,-65.9,-29.4,-73.8C-16,-81.7,-2.2,-87.5,10.6,-85.4C23.4,-83.3,44.7,-76.4,44.7,-76.4Z" transform="translate(100 100) scale(1.1)" />
              </Svg>
              <Avatar type={getOnboardingAvatar(index)} size={140} />
            </View>

            <Text style={styles.description}>{item.description}</Text>

            {item.hasFeatures && (
              <View style={styles.featuresList}>
                {item.features?.map((feature, i) => (
                  <View key={i} style={styles.featureRow}>
                    <View style={styles.featureIconWrap}>
                      <Icon name={feature.icon as any} size={16} color={COLORS.primary} />
                    </View>
                    <Text style={styles.featureText}>{feature.text}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={{flex: 1}} />

            <View style={styles.dotsRow}>
              {ONBOARDING_DATA.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => goToSlide(i)}>
                  <View style={[styles.dot, i === index && styles.dotActive]} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={() => {
                if (item.isLast) finishOnboarding();
                else nextSlide();
              }}
            >
              <Text style={styles.actionBtnText}>
                {item.isFirst ? 'Get Started' : item.isLast ? 'Enter Zovio' : 'Next'}
              </Text>
            </TouchableOpacity>

            {item.isFirst && (
              <TouchableOpacity
                style={styles.restoreBtn}
                onPress={async () => {
                  const restored = await restoreSecureBackup();
                  if (restored) {
                    await finishOnboarding();
                  }
                }}
              >
                <Icon name="shield-checkmark-outline" size={16} color={COLORS.secondary} />
                <Text style={styles.restoreBtnText}>Restore Secure Backup</Text>
              </TouchableOpacity>
            )}

            {(item.isFirst || item.isLast) && (
              <Text style={styles.footer}>Powered by Dakh Edu Solutions</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingTop: 60,
    paddingBottom: 40,
  },
  pageIndicator: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    marginBottom: 20,
  },
  skipText: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
  },
  slide: {
    width,
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  headerArea: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.secondary,
    letterSpacing: 1,
  },
  logoSubtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 8,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 32,
  },
  illustrationWrap: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 30,
  },
  blob: {
    position: 'absolute',
  },
  illustrationMock: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  description: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  featuresList: {
    width: '100%',
    paddingHorizontal: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.warningSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 16,
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  actionBtnText: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: '700',
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
    backgroundColor: '#FFFDF4',
    gap: 8,
    marginTop: -8,
    marginBottom: 20,
  },
  restoreBtnText: {
    color: COLORS.secondary,
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    fontSize: 10,
    color: COLORS.gray,
  },
});
