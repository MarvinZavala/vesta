import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  FlatList,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { usePortfolioStore } from '@/store/portfolioStore';
import { useAuthStore } from '@/store/authStore';
import { ASSET_TYPE_LABELS } from '@/utils/formatters';
import { FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { sendAIMessage, isAIConfigured, getAIProvider } from '@/services/ai';
import {
  createChatSession,
  getChatSessions,
  getChatMessages,
  addChatMessage,
  deleteChatSession,
} from '@/services/chatHistory';
import { ChatSession } from '@/types/database';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  withDelay,
} from 'react-native-reanimated';

const { width: SCREEN_W } = Dimensions.get('window');

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  {
    icon: 'analytics' as const,
    title: 'Portfolio Analysis',
    desc: 'Allocation & performance review',
    prompt: 'Analyze my portfolio allocation and performance. What stands out?',
  },
  {
    icon: 'shield-checkmark' as const,
    title: 'Risk Assessment',
    desc: 'Evaluate exposure & volatility',
    prompt: 'What is my current risk level and how can I manage it?',
  },
  {
    icon: 'swap-horizontal' as const,
    title: 'Rebalancing',
    desc: 'Optimize your allocations',
    prompt: 'Should I rebalance my portfolio? What changes would you suggest?',
  },
  {
    icon: 'trending-up' as const,
    title: 'Opportunities',
    desc: 'Growth & diversification ideas',
    prompt: 'What growth opportunities or diversification ideas do you see?',
  },
];

// --- Typing Dots (inline, no import needed from Skeleton) ---
function TypingDots() {
  const { colors, isDark } = useTheme();
  return (
    <View style={s.typingRow}>
      <View style={[s.typingAvatarSmall, { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(5,150,105,0.08)' }]}>
        <Ionicons name="sparkles" size={12} color={colors.primary} />
      </View>
      <View style={[s.typingBubble, { backgroundColor: isDark ? colors.backgroundSecondary : colors.backgroundTertiary }]}>
        <PulsingDot delay={0} />
        <PulsingDot delay={150} />
        <PulsingDot delay={300} />
      </View>
    </View>
  );
}

function PulsingDot({ delay }: { delay: number }) {
  const { colors } = useTheme();
  const anim = useSharedValue(0);

  useEffect(() => {
    anim.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 600 }), -1, true)
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(anim.value, [0, 1], [0.25, 0.8]),
    transform: [{ scale: interpolate(anim.value, [0, 1], [0.85, 1.15]) }],
  }));

  return (
    <Animated.View
      style={[{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.primary }, style]}
    />
  );
}

// ============================================================
export default function AIChatScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const { profile, user } = useAuthStore();
  const { holdingsWithPrices, summary } = usePortfolioStore();

  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const isPremiumPlus = profile?.subscription_tier !== 'free';

  useEffect(() => {
    if (!isPremiumPlus) router.replace('/paywall');
  }, [isPremiumPlus]);

  useEffect(() => {
    if (user?.id) loadSessions();
  }, [user?.id]);

  useEffect(() => {
    if (params.sessionId) loadSession(params.sessionId);
  }, [params.sessionId]);

  const loadSessions = async () => {
    if (!user?.id) return;
    setLoadingSessions(true);
    const data = await getChatSessions(user.id);
    setSessions(data);
    setLoadingSessions(false);
  };

  const loadSession = async (sessionId: string) => {
    const chatMessages = await getChatMessages(sessionId);
    setCurrentSessionId(sessionId);
    setMessages(
      chatMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.created_at),
      }))
    );
    setShowHistory(false);
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setShowHistory(false);
  };

  const handleDeleteSession = async (sessionId: string) => {
    Alert.alert('Delete Conversation', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteChatSession(sessionId);
          if (currentSessionId === sessionId) startNewChat();
          loadSessions();
        },
      },
    ]);
  };

  const buildPortfolioContext = useCallback(() => {
    const totalValue = summary?.total_value ?? 0;
    const totalGainLoss = summary?.total_gain_loss ?? 0;
    const totalGainLossPercent =
      totalValue > 0 ? (totalGainLoss / (totalValue - totalGainLoss)) * 100 : 0;
    return {
      totalValue,
      totalGainLoss,
      totalGainLossPercent,
      holdings: holdingsWithPrices.map((h) => {
        const costBasis = h.cost_basis ?? 0;
        return {
          name: h.name,
          symbol: h.symbol ?? undefined,
          type: ASSET_TYPE_LABELS[h.asset_type] || h.asset_type,
          value: h.current_value,
          allocation: totalValue > 0 ? (h.current_value / totalValue) * 100 : 0,
          gainLoss: h.gain_loss,
          gainLossPercent: costBasis > 0 ? ((h.current_value - costBasis) / costBasis) * 100 : 0,
        };
      }),
      allocationByType: summary?.allocation_by_type ?? {},
      allocationBySector: summary?.allocation_by_sector,
      allocationByCountry: summary?.allocation_by_country,
    };
  }, [holdingsWithPrices, summary]);

  const aiConfigured = isAIConfigured();
  const aiProvider = getAIProvider();

  const handleSend = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || isLoading || !user?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    let sessionId = currentSessionId;
    if (!sessionId) {
      const session = await createChatSession(user.id, messageText);
      if (session) {
        sessionId = session.id;
        setCurrentSessionId(sessionId);
        loadSessions();
      }
    }

    const userMessage: LocalMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    if (sessionId) await addChatMessage(sessionId, 'user', messageText);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const ctx = buildPortfolioContext();
      const response = await sendAIMessage(messageText, ctx, history);

      const assistantMessage: LocalMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      if (sessionId) await addChatMessage(sessionId, 'assistant', response);
    } catch (error) {
      console.error('AI Chat error:', error);
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Something went wrong. Please try again.', timestamp: new Date() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  // ── Format time ─────────────────────────────────
  const formatTime = (date: Date) => {
    const h = date.getHours();
    const m = date.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${m} ${ampm}`;
  };

  // ── History View ────────────────────────────────
  if (showHistory) {
    return (
      <View style={[s.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        {/* History Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => setShowHistory(false)} style={s.headerBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>History</Text>
          <TouchableOpacity onPress={startNewChat} style={s.headerBtn} hitSlop={12}>
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {loadingSessions ? (
          <ActivityIndicator style={{ marginTop: Spacing.xxl }} color={colors.primary} />
        ) : sessions.length === 0 ? (
          <View style={s.emptyHistory}>
            <View style={[s.emptyHistoryIcon, { backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(5,150,105,0.06)' }]}>
              <Ionicons name="chatbubbles-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[s.emptyHistoryTitle, { color: colors.text }]}>No Conversations</Text>
            <Text style={[s.emptyHistorySub, { color: colors.textSecondary }]}>
              Start a new chat to get AI-powered insights
            </Text>
          </View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.sm }}
            renderItem={({ item }) => {
              const isActive = item.id === currentSessionId;
              return (
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={() => loadSession(item.id)}
                  onLongPress={() => handleDeleteSession(item.id)}
                  delayLongPress={500}
                >
                  <View
                    style={[
                      s.historyCard,
                      {
                        backgroundColor: isActive
                          ? isDark ? 'rgba(16,185,129,0.1)' : 'rgba(5,150,105,0.06)'
                          : colors.card,
                        borderColor: isActive ? colors.primary : 'transparent',
                        ...(!isActive ? Shadow.sm : {}),
                      },
                    ]}
                  >
                    <View style={[s.historyIconBox, { backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(5,150,105,0.06)' }]}>
                      <Ionicons name="chatbubble" size={14} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.historyItemTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[s.historyItemDate, { color: colors.textTertiary }]}>
                        {new Date(item.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    );
  }

  // ── Main Chat View ──────────────────────────────
  return (
    <View style={[s.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <View style={[s.headerDot, { backgroundColor: colors.primary }]}>
            <Ionicons name="sparkles" size={10} color="#FFF" />
          </View>
          <Text style={[s.headerTitle, { color: colors.text }]}>Vesta AI</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity
            onPress={() => { loadSessions(); setShowHistory(true); }}
            style={s.headerBtn}
            hitSlop={12}
          >
            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={startNewChat} style={s.headerBtn} hitSlop={12}>
            <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[s.messagesContent, messages.length === 0 && { flexGrow: 1 }]}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            /* ── Welcome / Empty State ── */
            <View style={s.welcome}>
              <LinearGradient
                colors={isDark
                  ? ['rgba(16,185,129,0.15)', 'rgba(16,185,129,0.03)']
                  : ['rgba(5,150,105,0.08)', 'rgba(5,150,105,0.01)']}
                style={s.welcomeGlow}
              />
              <View style={[s.welcomeAvatar]}>
                <LinearGradient
                  colors={isDark ? ['#10B981', '#059669'] : ['#059669', '#047857']}
                  style={s.welcomeAvatarGradient}
                >
                  <Ionicons name="sparkles" size={30} color="#FFF" />
                </LinearGradient>
              </View>

              <Text style={[s.welcomeTitle, { color: colors.text }]}>
                Vesta AI
              </Text>
              <Text style={[s.welcomeSub, { color: colors.textSecondary }]}>
                Your personal portfolio advisor.{'\n'}Ask anything about your investments.
              </Text>

              {/* Provider badge */}
              <View style={[
                s.providerBadge,
                { backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(5,150,105,0.06)' },
              ]}>
                <View style={[s.providerDot, { backgroundColor: aiConfigured ? colors.gain : colors.warning }]} />
                <Text style={[s.providerText, { color: colors.textSecondary }]}>
                  {aiConfigured ? (aiProvider === 'claude' ? 'Powered by Claude' : 'Powered by OpenAI') : 'Demo Mode'}
                </Text>
              </View>

              {/* Suggestion Cards */}
              <View style={s.suggestionsGrid}>
                {SUGGESTIONS.map((item, i) => (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.7}
                    style={[
                      s.suggestionCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: isDark ? colors.border : 'rgba(0,0,0,0.04)',
                        ...(isDark ? {} : Shadow.sm),
                      },
                    ]}
                    onPress={() => handleSend(item.prompt)}
                  >
                    <View style={[s.suggestionIcon, { backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(5,150,105,0.06)' }]}>
                      <Ionicons name={item.icon as any} size={18} color={colors.primary} />
                    </View>
                    <Text style={[s.suggestionTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[s.suggestionDesc, { color: colors.textTertiary }]} numberOfLines={1}>
                      {item.desc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            /* ── Messages ── */
            messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const showTime =
                idx === 0 ||
                msg.timestamp.getTime() - messages[idx - 1].timestamp.getTime() > 5 * 60 * 1000;

              return (
                <View key={msg.id}>
                  {showTime && (
                    <Text style={[s.msgTime, { color: colors.textTertiary }]}>
                      {formatTime(msg.timestamp)}
                    </Text>
                  )}
                  {isUser ? (
                    <View style={s.userRow}>
                      <View style={[s.userBubble, { backgroundColor: colors.primary }]}>
                        <Text style={s.userText}>{msg.content}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={s.assistantRow}>
                      <View style={[s.assistantAvatarSmall, { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(5,150,105,0.08)' }]}>
                        <Ionicons name="sparkles" size={12} color={colors.primary} />
                      </View>
                      <View style={[s.assistantBubble, { backgroundColor: isDark ? colors.backgroundSecondary : colors.backgroundTertiary }]}>
                        <Text style={[s.assistantText, { color: colors.text }]}>{msg.content}</Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}

          {isLoading && <TypingDots />}
        </ScrollView>

        {/* ── Input Bar ── */}
        <View
          style={[
            s.inputBar,
            {
              backgroundColor: colors.background,
              borderTopColor: isDark ? colors.border : 'rgba(0,0,0,0.06)',
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View
            style={[
              s.inputPill,
              {
                backgroundColor: isDark ? colors.backgroundSecondary : colors.backgroundTertiary,
              },
            ]}
          >
            <TextInput
              style={[s.input, { color: colors.text }]}
              placeholder="Ask about your portfolio..."
              placeholderTextColor={colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                s.sendBtn,
                {
                  backgroundColor: inputText.trim() ? colors.primary : isDark ? colors.backgroundTertiary : colors.border,
                },
              ]}
              onPress={() => handleSend()}
              disabled={!inputText.trim() || isLoading}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-up"
                size={18}
                color={inputText.trim() ? '#FFF' : colors.textTertiary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────
const s = StyleSheet.create({
  screen: {
    flex: 1,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerDot: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  // ── Messages ──
  messagesContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  msgTime: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
    marginVertical: Spacing.md,
    letterSpacing: 0.2,
  },

  // User
  userRow: {
    alignItems: 'flex-end',
    marginBottom: Spacing.sm,
  },
  userBubble: {
    maxWidth: '82%',
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    borderRadius: 20,
    borderBottomRightRadius: 6,
  },
  userText: {
    color: '#FFF',
    fontSize: FontSize.md,
    lineHeight: 22,
    letterSpacing: -0.1,
  },

  // Assistant
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  assistantAvatarSmall: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  assistantBubble: {
    maxWidth: '78%',
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
  },
  assistantText: {
    fontSize: FontSize.md,
    lineHeight: 22,
    letterSpacing: -0.1,
  },

  // Typing
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  typingAvatarSmall: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  typingBubble: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    alignItems: 'center',
  },

  // ── Welcome ──
  welcome: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  welcomeGlow: {
    position: 'absolute',
    top: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.8,
  },
  welcomeAvatar: {
    marginBottom: Spacing.md,
  },
  welcomeAvatarGradient: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  welcomeSub: {
    fontSize: FontSize.md,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: Spacing.md,
    letterSpacing: -0.1,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xl,
  },
  providerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  providerText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },

  // Suggestion cards
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
    maxWidth: 380,
  },
  suggestionCard: {
    width: (SCREEN_W - Spacing.lg * 2 - Spacing.md * 2 - 10) / 2,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  suggestionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  suggestionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    letterSpacing: -0.2,
  },
  suggestionDesc: {
    fontSize: 12,
    lineHeight: 16,
  },

  // ── Input ──
  inputBar: {
    paddingTop: 10,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputPill: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingLeft: Spacing.md,
    paddingRight: 5,
    paddingVertical: 5,
    minHeight: 46,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    maxHeight: 100,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── History ──
  emptyHistory: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 80,
  },
  emptyHistoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyHistoryTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    letterSpacing: -0.3,
  },
  emptyHistorySub: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    maxWidth: 240,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  historyIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyItemTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  historyItemDate: {
    fontSize: FontSize.xs,
  },
});
