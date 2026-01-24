import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { forgotPassword, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }

    setError('');
    const result = await forgotPassword(email);

    if (result.success) {
      setSent(true);
    } else {
      Alert.alert('Error', result.error || 'Please try again');
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />

        <View style={styles.successContainer}>
          <Animated.View
            entering={FadeInDown.duration(600)}
            style={[styles.successIcon, { backgroundColor: colors.successLight }]}
          >
            <Ionicons name="mail-outline" size={48} color={colors.success} />
          </Animated.View>

          <Animated.Text
            entering={FadeInDown.delay(200).duration(600)}
            style={[styles.successTitle, { color: colors.text }]}
          >
            Check Your Email
          </Animated.Text>

          <Animated.Text
            entering={FadeInDown.delay(300).duration(600)}
            style={[styles.successSubtitle, { color: colors.textSecondary }]}
          >
            We've sent password reset instructions to {email}
          </Animated.Text>

          <Animated.View
            entering={FadeInDown.delay(400).duration(600)}
            style={styles.successButton}
          >
            <Button
              title="Back to Sign In"
              onPress={() => router.replace('/(auth)/sign-in')}
              fullWidth
              size="lg"
            />
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            entering={FadeInDown.duration(600)}
            style={styles.header}
          >
            <Text style={[styles.title, { color: colors.text }]}>
              Reset Password
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter your email and we'll send you instructions to reset your password
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(200).duration(600)}
            style={styles.form}
          >
            <Input
              label="Email"
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              leftIcon="mail-outline"
              error={error}
            />

            <Button
              title="Send Reset Link"
              onPress={handleReset}
              loading={isLoading}
              fullWidth
              size="lg"
              style={{ marginTop: Spacing.md }}
            />

            <Button
              title="Back to Sign In"
              variant="ghost"
              onPress={() => router.back()}
              fullWidth
              size="lg"
              style={{ marginTop: Spacing.md }}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  successButton: {
    width: '100%',
  },
});
