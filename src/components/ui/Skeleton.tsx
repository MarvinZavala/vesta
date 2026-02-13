import React, { useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { BorderRadius, Spacing } from '@/constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = BorderRadius.sm,
  style,
}: SkeletonProps) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(opacity.value, [0.3, 1], [0.3, 0.7]),
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.backgroundTertiary,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function CardSkeleton() {
  const { colors } = useTheme();

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        gap: Spacing.sm,
      }}
    >
      <Skeleton width="60%" height={16} />
      <Skeleton width="100%" height={12} />
      <Skeleton width="80%" height={12} />
    </View>
  );
}

export function HoldingItemSkeleton() {
  const { colors } = useTheme();

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
      }}
    >
      <Skeleton width={44} height={44} borderRadius={BorderRadius.md} />
      <View style={{ flex: 1, gap: Spacing.xs }}>
        <Skeleton width="50%" height={16} />
        <Skeleton width="30%" height={12} />
      </View>
      <View style={{ alignItems: 'flex-end', gap: Spacing.xs }}>
        <Skeleton width={60} height={16} />
        <Skeleton width={40} height={12} />
      </View>
    </View>
  );
}

export function AlertItemSkeleton() {
  const { colors } = useTheme();

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
      }}
    >
      <Skeleton width={44} height={44} borderRadius={BorderRadius.md} />
      <View style={{ flex: 1, gap: Spacing.xs }}>
        <Skeleton width="40%" height={16} />
        <Skeleton width="60%" height={12} />
      </View>
      <Skeleton width={44} height={24} borderRadius={BorderRadius.full} />
    </View>
  );
}

export function TypingIndicator() {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignSelf: 'flex-start',
        backgroundColor: colors.backgroundSecondary,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        gap: 6,
        alignItems: 'center',
      }}
    >
      <PulsingDot delay={0} />
      <PulsingDot delay={200} />
      <PulsingDot delay={400} />
    </View>
  );
}

function PulsingDot({ delay }: { delay: number }) {
  const { colors } = useTheme();
  const scale = useSharedValue(0.5);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1, { duration: 600 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scale.value, [0.5, 1], [0.3, 0.8]),
    transform: [{ scale: interpolate(scale.value, [0.5, 1], [0.8, 1.2]) }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: colors.primary,
        },
        animatedStyle,
      ]}
    />
  );
}
