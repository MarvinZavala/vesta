import React, { useEffect, useCallback } from 'react';
import { Text, StyleSheet, TextStyle, StyleProp } from 'react-native';
import {
  useSharedValue,
  useAnimatedReaction,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { formatCurrency } from '@/utils/formatters';

interface AnimatedCounterProps {
  value: number;
  currency?: string;
  duration?: number;
  style?: StyleProp<TextStyle>;
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
  const [displayValue, setDisplayValue] = React.useState(
    formatCurrency(0, currency)
  );

  // Format on JS thread, not worklet thread (Intl.NumberFormat unavailable in worklets)
  const updateDisplay = useCallback(
    (val: number) => {
      setDisplayValue(formatCurrency(val, currency));
    },
    [currency]
  );

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, duration]);

  useAnimatedReaction(
    () => animatedValue.value,
    (currentValue) => {
      runOnJS(updateDisplay)(currentValue);
    }
  );

  return (
    <Text style={[styles.text, style]}>
      {prefix}{displayValue}{suffix}
    </Text>
  );
}

// Simple percentage counter
interface PercentCounterProps {
  value: number;
  duration?: number;
  style?: StyleProp<TextStyle>;
  showSign?: boolean;
}

export function PercentCounter({
  value,
  duration = 600,
  style,
  showSign = true,
}: PercentCounterProps) {
  const animatedValue = useSharedValue(0);
  const [displayValue, setDisplayValue] = React.useState('0.00%');

  // Format on JS thread, not worklet thread
  const updateDisplay = useCallback(
    (val: number) => {
      const sign = showSign && val >= 0 ? '+' : '';
      setDisplayValue(`${sign}${val.toFixed(2)}%`);
    },
    [showSign]
  );

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, duration]);

  useAnimatedReaction(
    () => animatedValue.value,
    (currentValue) => {
      runOnJS(updateDisplay)(currentValue);
    }
  );

  return (
    <Text style={[styles.text, style]}>
      {displayValue}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontVariant: ['tabular-nums'],
  },
});
