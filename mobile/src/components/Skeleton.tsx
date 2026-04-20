import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const { isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: isDark ? '#334155' : '#e5e7eb', opacity },
        style,
      ]}
    />
  );
}

export function KartSkeleton() {
  const { c } = useTheme();
  return (
    <View style={[styles.kart, { backgroundColor: c.card }]}>
      <View style={styles.ust}>
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonBox width="60%" height={14} />
          <SkeletonBox width="40%" height={11} />
        </View>
        <SkeletonBox width={60} height={22} borderRadius={8} />
      </View>
      <SkeletonBox width="45%" height={12} style={{ marginTop: 8 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  kart: {
    borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  ust: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 6 },
});
