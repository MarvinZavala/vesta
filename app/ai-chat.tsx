import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Card } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { usePortfolioStore } from '@/store/portfolioStore';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, ASSET_TYPE_LABELS } from '@/utils/formatters';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  { icon: 'pie-chart', label: 'How diversified am I?', prompt: 'Analyze my portfolio diversification and give me recommendations.' },
  { icon: 'warning', label: "What's my risk level?", prompt: 'What is my portfolio risk score and what factors contribute to it?' },
  { icon: 'shuffle', label: 'Should I rebalance?', prompt: 'Do you recommend rebalancing my portfolio? If so, what changes should I make?' },
  { icon: 'trending-up', label: 'Growth opportunities', prompt: 'Based on my current holdings, what growth opportunities should I consider?' },
];

export default function AIChatScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const { profile } = useAuthStore();
  const { holdingsWithPrices, summary } = usePortfolioStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check if user has Premium+
  const isPremiumPlus = profile?.subscription_tier === 'premium_plus';

  useEffect(() => {
    if (!isPremiumPlus) {
      router.replace('/paywall');
    }
  }, [isPremiumPlus]);

  // Build portfolio context for AI
  const buildPortfolioContext = () => {
    const context = {
      totalValue: formatCurrency(summary?.total_value ?? 0),
      totalGainLoss: formatCurrency(summary?.total_gain_loss ?? 0),
      holdingsCount: holdingsWithPrices.length,
      holdings: holdingsWithPrices.map(h => ({
        name: h.symbol || h.name,
        type: ASSET_TYPE_LABELS[h.asset_type],
        value: formatCurrency(h.current_value),
        allocation: summary?.total_value ? ((h.current_value / summary.total_value) * 100).toFixed(1) + '%' : '0%',
        gainLoss: formatCurrency(h.gain_loss),
      })),
      allocationByType: summary?.allocation_by_type,
      allocationBySector: summary?.allocation_by_sector,
      allocationByCountry: summary?.allocation_by_country,
    };
    return JSON.stringify(context, null, 2);
  };

  // Simulate AI response (In real app, call OpenAI via Supabase Edge Function)
  const generateAIResponse = async (userMessage: string): Promise<string> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    const context = buildPortfolioContext();

    // Mock responses based on keywords
    if (userMessage.toLowerCase().includes('diversif')) {
      return `Based on your portfolio analysis, here's my assessment:

**Diversification Score: 65/100**

**Strengths:**
- You have ${holdingsWithPrices.length} different assets
- Mix of asset types is reasonable

**Areas for Improvement:**
${summary?.allocation_by_type && Object.entries(summary.allocation_by_type)
  .filter(([_, v]) => v > 40)
  .map(([type, _]) => `- High concentration in ${ASSET_TYPE_LABELS[type] || type}`)
  .join('\n') || '- Consider adding more asset variety'}

**Recommendations:**
1. Consider adding international exposure
2. Look into bonds for stability
3. Diversify across more sectors

*This is educational information, not financial advice.*`;
    }

    if (userMessage.toLowerCase().includes('risk')) {
      const riskScore = Math.floor(40 + Math.random() * 30);
      return `**Portfolio Risk Assessment**

Your estimated risk score is **${riskScore}/100** (${riskScore < 40 ? 'Low' : riskScore < 70 ? 'Moderate' : 'High'} Risk)

**Risk Factors:**
- Asset concentration level
- Market volatility exposure
- Geographic concentration

**Risk Mitigation Suggestions:**
1. Add fixed-income assets for stability
2. Consider hedging strategies
3. Maintain emergency cash reserves

*Remember: Higher risk can mean higher potential returns, but also greater potential losses.*`;
    }

    if (userMessage.toLowerCase().includes('rebalanc')) {
      return `**Rebalancing Analysis**

Based on your current allocation, here are my thoughts:

**Current State:**
${holdingsWithPrices.slice(0, 3).map(h =>
  `- ${h.symbol || h.name}: ${summary?.total_value ? ((h.current_value / summary.total_value) * 100).toFixed(1) : 0}%`
).join('\n')}

**Suggested Actions:**
1. Review any positions over 25% allocation
2. Consider trimming winners to lock in gains
3. Look for underweight sectors to add to

**When to Rebalance:**
- When allocation drifts 5%+ from target
- Quarterly or semi-annually
- After major life events

*Always consider tax implications before rebalancing.*`;
    }

    // Default response
    return `Thank you for your question about your portfolio.

Based on my analysis of your ${holdingsWithPrices.length} holdings worth ${formatCurrency(summary?.total_value ?? 0)}:

Your portfolio shows a ${(summary?.total_gain_loss ?? 0) >= 0 ? 'positive' : 'negative'} overall return of ${formatCurrency(Math.abs(summary?.total_gain_loss ?? 0))}.

Would you like me to analyze a specific aspect? Try asking about:
- Diversification analysis
- Risk assessment
- Rebalancing suggestions

*This is educational information, not financial advice. Please consult a financial advisor for personalized guidance.*`;
  };

  const handleSend = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || isLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await generateAIResponse(messageText);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.length === 0 ? (
          <Animated.View entering={FadeIn.duration(600)} style={styles.welcomeContainer}>
            <View style={[styles.aiAvatar, { backgroundColor: colors.primary }]}>
              <Ionicons name="sparkles" size={32} color="#FFFFFF" />
            </View>
            <Text style={[styles.welcomeTitle, { color: colors.text }]}>
              Hi! I'm Vesta AI
            </Text>
            <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
              Your personal portfolio advisor. Ask me anything about your investments.
            </Text>

            <Text style={[styles.quickPromptsTitle, { color: colors.text }]}>
              Quick questions:
            </Text>
            <View style={styles.quickPrompts}>
              {QUICK_PROMPTS.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.quickPrompt,
                    { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                  ]}
                  onPress={() => handleSend(item.prompt)}
                >
                  <Ionicons name={item.icon as any} size={18} color={colors.primary} />
                  <Text style={[styles.quickPromptText, { color: colors.text }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        ) : (
          messages.map((message, index) => (
            <Animated.View
              key={message.id}
              entering={FadeInDown.delay(index === messages.length - 1 ? 0 : 0).duration(300)}
              style={[
                styles.messageBubble,
                message.role === 'user'
                  ? [styles.userBubble, { backgroundColor: colors.primary }]
                  : [styles.assistantBubble, { backgroundColor: colors.backgroundSecondary }],
              ]}
            >
              {message.role === 'assistant' && (
                <View style={styles.assistantHeader}>
                  <Ionicons name="sparkles" size={16} color={colors.primary} />
                  <Text style={[styles.assistantLabel, { color: colors.primary }]}>
                    Vesta AI
                  </Text>
                </View>
              )}
              <Text
                style={[
                  styles.messageText,
                  { color: message.role === 'user' ? '#FFFFFF' : colors.text },
                ]}
              >
                {message.content}
              </Text>
            </Animated.View>
          ))
        )}

        {isLoading && (
          <View style={[styles.loadingBubble, { backgroundColor: colors.backgroundSecondary }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Analyzing your portfolio...
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View
          style={[
            styles.inputWrapper,
            { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
          ]}
        >
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Ask about your portfolio..."
            placeholderTextColor={colors.textTertiary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: inputText.trim() ? colors.primary : colors.backgroundTertiary,
              },
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons
              name="arrow-up"
              size={20}
              color={inputText.trim() ? '#FFFFFF' : colors.textTertiary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  aiAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  welcomeTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  welcomeSubtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  quickPromptsTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.md,
    alignSelf: 'flex-start',
  },
  quickPrompts: {
    width: '100%',
    gap: Spacing.sm,
  },
  quickPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  quickPromptText: {
    fontSize: FontSize.md,
    flex: 1,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: Spacing.xs,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: Spacing.xs,
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  assistantLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  messageText: {
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: FontSize.sm,
  },
  inputContainer: {
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    maxHeight: 100,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xs,
  },
});
