import React, { useEffect } from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  useDerivedValue,
  runOnJS,
} from 'react-native-reanimated';
import { formatCurrency } from '@/utils/formatters';

interface AnimatedCounterProps {
  value: number;
  currency?: string;
  duration?: number;
  style?: TextStyle;
  prefix?: string;
  suffix?: string;
}

export function AnimatedCounter({
  value,
  currency = 'USD',
  duration = 800,
  style,
  prefix = '',
  suffix = '',
}: AnimatedCounterProps) {
  const animatedValue = useSharedValue(0);
  const [displayValue, setDisplayValue] = React.useState('0');

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, duration]);

  useDerivedValue(() => {
    runOnJS(setDisplayValue)(formatCurrency(animatedValue.value, currency));
  });

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(1, { duration: 200 }),
  }));

  return (
    <Animated.Text style={[styles.text, style, animatedStyle]}>
      {prefix}{displayValue}{suffix}
    </Animated.Text>
  );
}

// Simple percentage counter
interface PercentCounterProps {
  value: number;
  duration?: number;
  style?: TextStyle;
  showSign?: boolean;
}

export function PercentCounter({
  value,
  duration = 600,
  style,
  showSign = true,
}: PercentCounterProps) {
  const animatedValue = useSharedValue(0);
  const [displayValue, setDisplayValue] = React.useState('0.00');

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, duration]);

  useDerivedValue(() => {
    const sign = showSign && animatedValue.value >= 0 ? '+' : '';
    runOnJS(setDisplayValue)(`${sign}${animatedValue.value.toFixed(2)}%`);
  });

  return (
    <Animated.Text style={[styles.text, style]}>
      {displayValue}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontVariant: ['tabular-nums'],
  },
});
