import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { usePortfolioStore } from '@/store/portfolioStore';
import { useAuthStore } from '@/store/authStore';
import { AssetType } from '@/types/database';
import { formatCurrency } from '@/utils/formatters';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { TIER_LIMITS } from '@/services/revenuecat';
import {
  PopularAsset,
  searchAssets,
  getFeaturedAssets,
} from '@/data/popularAssets';
import {
  searchStocks,
  validateStockSymbol,
  isFinnhubTypeCompatible,
} from '@/services/prices/finnhub';
import { searchCoins, resolveCoinGeckoId } from '@/services/prices/coingecko';

interface AddAssetSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// ── Asset type configuration ──────────────────────────────────────────────
interface AssetTypeConfig {
  type: AssetType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const ASSET_CATEGORIES: { title: string; items: AssetTypeConfig[] }[] = [
  {
    title: 'INVESTMENTS',
    items: [
      { type: 'stock', label: 'Stocks', icon: 'trending-up', color: '#10B981' },
      { type: 'etf', label: 'ETFs', icon: 'layers', color: '#6366F1' },
      { type: 'mutual_fund', label: 'Mutual Funds', icon: 'pie-chart', color: '#8B5CF6' },
      { type: 'crypto', label: 'Crypto', icon: 'logo-bitcoin', color: '#F59E0B' },
    ],
  },
  {
    title: 'PRECIOUS METALS',
    items: [
      { type: 'commodity_gold', label: 'Gold', icon: 'diamond', color: '#EAB308' },
      { type: 'commodity_silver', label: 'Silver', icon: 'diamond-outline', color: '#94A3B8' },
      { type: 'commodity_platinum', label: 'Platinum', icon: 'diamond', color: '#6B7280' },
    ],
  },
  {
    title: 'FIXED INCOME',
    items: [
      { type: 'fixed_income_bond', label: 'Bonds', icon: 'document-text', color: '#10B981' },
      { type: 'fixed_income_cd', label: 'CDs', icon: 'wallet', color: '#14B8A6' },
    ],
  },
  {
    title: 'OTHER ASSETS',
    items: [
      { type: 'real_estate', label: 'Real Estate', icon: 'business', color: '#EC4899' },
      { type: 'cash', label: 'Cash / Savings', icon: 'cash', color: '#22C55E' },
      { type: 'other', label: 'Other', icon: 'grid', color: '#8B5CF6' },
    ],
  },
];

const ALL_TYPES = ASSET_CATEGORIES.flatMap(c => c.items);

// Types that support symbol search
const SEARCHABLE_TYPES: AssetType[] = ['stock', 'etf', 'mutual_fund', 'crypto'];

// Types where quantity=1 and value is the "amount"
const SINGLE_VALUE_TYPES: AssetType[] = ['real_estate', 'cash', 'other'];

// Types that need manual pricing (no live API)
const MANUAL_PRICE_TYPES: AssetType[] = ['real_estate', 'cash', 'other', 'fixed_income_bond', 'fixed_income_cd'];

// ── Quantity/price labels per type ────────────────────────────────────────
function getFormConfig(type: AssetType) {
  switch (type) {
    case 'stock':
    case 'etf':
    case 'mutual_fund':
      return { qtyLabel: 'Number of Shares', priceLabel: 'Avg. Cost per Share', unit: 'share' };
    case 'crypto':
      return { qtyLabel: 'Amount', priceLabel: 'Avg. Cost per Coin', unit: 'coin' };
    case 'commodity_gold':
    case 'commodity_silver':
    case 'commodity_platinum':
      return { qtyLabel: 'Weight (troy oz)', priceLabel: 'Purchase Price per oz', unit: 'oz' };
    case 'fixed_income_bond':
      return { qtyLabel: 'Number of Bonds', priceLabel: 'Price per Bond', unit: 'bond' };
    case 'fixed_income_cd':
      return { qtyLabel: '', priceLabel: '', unit: '' }; // Special form
    case 'real_estate':
      return { qtyLabel: '', priceLabel: '', unit: '' }; // Special form
    case 'cash':
      return { qtyLabel: '', priceLabel: '', unit: '' }; // Special form
    case 'other':
      return { qtyLabel: '', priceLabel: '', unit: '' }; // Special form
    default:
      return { qtyLabel: 'Quantity', priceLabel: 'Price per Unit', unit: 'unit' };
  }
}

// Default names for certain asset types
function getDefaultName(type: AssetType): string {
  switch (type) {
    case 'commodity_gold': return 'Gold';
    case 'commodity_silver': return 'Silver';
    case 'commodity_platinum': return 'Platinum';
    default: return '';
  }
}

function getDefaultSymbol(type: AssetType): string {
  switch (type) {
    case 'commodity_gold': return 'XAU';
    case 'commodity_silver': return 'XAG';
    case 'commodity_platinum': return 'XPT';
    default: return '';
  }
}

function getCanonicalSymbol(type: AssetType, rawSymbol: string): string {
  const symbol = rawSymbol.trim().toUpperCase();
  const metalSymbol = getDefaultSymbol(type);
  return metalSymbol || symbol;
}

export function AddAssetSheet({ visible, onClose, onSuccess }: AddAssetSheetProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const { addHolding, portfolios, holdings } = usePortfolioStore();
  const { profile } = useAuthStore();

  const [step, setStep] = useState<'type' | 'search' | 'details'>('type');
  const [selectedType, setSelectedType] = useState<AssetType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<PopularAsset | null>(null);
  const [apiSearchResults, setApiSearchResults] = useState<PopularAsset[]>([]);
  const [isApiSearching, setIsApiSearching] = useState(false);
  const apiSearchRequestIdRef = useRef(0);

  // Common fields
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sector, setSector] = useState('');

  // "Per unit" vs "Total invested" mode
  const [costMode, setCostMode] = useState<'perUnit' | 'total'>('perUnit');

  // Fixed income fields
  const [interestRate, setInterestRate] = useState('');
  const [maturityDate, setMaturityDate] = useState('');
  const [paymentFrequency, setPaymentFrequency] = useState<'monthly' | 'quarterly' | 'annually'>('annually');

  // Real estate fields
  const [currentValue, setCurrentValue] = useState('');
  const [propertyType, setPropertyType] = useState<'residential' | 'commercial' | 'land'>('residential');
  const [propertyAddress, setPropertyAddress] = useState('');

  // Inline validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Derived values ──────────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 1) return [];
    const localResults = searchAssets(searchQuery, selectedType || undefined);
    const mergedByKey = new Map<string, PopularAsset>();

    for (const asset of [...localResults, ...apiSearchResults]) {
      mergedByKey.set(`${asset.type}:${asset.symbol}`, asset);
    }

    return Array.from(mergedByKey.values()).slice(0, 12);
  }, [searchQuery, selectedType, apiSearchResults]);

  const featuredAssets = useMemo(() => {
    if (!selectedType) return [];
    return getFeaturedAssets(selectedType);
  }, [selectedType]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!selectedType || !SEARCHABLE_TYPES.includes(selectedType) || query.length < 2) {
      apiSearchRequestIdRef.current += 1;
      setApiSearchResults([]);
      setIsApiSearching(false);
      return;
    }

    const requestId = apiSearchRequestIdRef.current + 1;
    apiSearchRequestIdRef.current = requestId;
    setIsApiSearching(true);

    const timer = setTimeout(async () => {
      try {
        let results: PopularAsset[] = [];

        if (selectedType === 'crypto') {
          const coins = await searchCoins(query);
          results = coins.slice(0, 12).map((coin) => ({
            symbol: coin.symbol.toUpperCase(),
            name: coin.name,
            type: 'crypto',
          }));
        } else {
          const marketType = selectedType as 'stock' | 'etf' | 'mutual_fund';
          const stocks = await searchStocks(query);
          results = stocks
            .filter((item) => isFinnhubTypeCompatible(item.type, marketType))
            .slice(0, 12)
            .map((item) => ({
              symbol: (item.displaySymbol || item.symbol).toUpperCase(),
              name: item.description || item.displaySymbol || item.symbol,
              type: marketType,
              country: 'US',
            }));
        }

        if (apiSearchRequestIdRef.current === requestId) {
          setApiSearchResults(results);
        }
      } catch (error) {
        console.error('Live search failed:', error);
        if (apiSearchRequestIdRef.current === requestId) {
          setApiSearchResults([]);
        }
      } finally {
        if (apiSearchRequestIdRef.current === requestId) {
          setIsApiSearching(false);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedType]);

  const typeConfig = useMemo(() => ALL_TYPES.find(t => t.type === selectedType), [selectedType]);
  const formConfig = useMemo(() => selectedType ? getFormConfig(selectedType) : null, [selectedType]);

  // Calculate cost basis summary
  const costSummary = useMemo(() => {
    const qty = parseFloat(quantity);
    const price = parseFloat(purchasePrice);
    if (!qty || qty <= 0) return null;
    if (!price || price <= 0) return null;

    if (costMode === 'total') {
      return { total: price, perUnit: price / qty };
    }
    return { total: qty * price, perUnit: price };
  }, [quantity, purchasePrice, costMode]);

  // ── Actions ─────────────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setStep('type');
    setSelectedType(null);
    setSearchQuery('');
    setSelectedAsset(null);
    setName('');
    setSymbol('');
    setQuantity('');
    setPurchasePrice('');
    setSector('');
    setCostMode('perUnit');
    setInterestRate('');
    setMaturityDate('');
    setPaymentFrequency('annually');
    setCurrentValue('');
    setPropertyType('residential');
    setPropertyAddress('');
    setErrors({});
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const setError = useCallback((field: string, msg: string) => {
    setErrors(prev => ({ ...prev, [field]: msg }));
  }, []);

  const clearError = useCallback((field: string) => {
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  }, []);

  const handleSelectType = useCallback((type: AssetType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedType(type);
    setErrors({});
    setSelectedAsset(null);
    setSearchQuery('');
    setApiSearchResults([]);
    setIsApiSearching(false);
    setSector('');

    // Pre-fill name for metals
    const defaultName = getDefaultName(type);
    setName(defaultName || '');
    setSymbol(getDefaultSymbol(type));

    if (SEARCHABLE_TYPES.includes(type)) {
      setStep('search');
    } else {
      setStep('details');
    }
  }, []);

  const handleSelectAsset = useCallback((asset: PopularAsset) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    setSelectedAsset(asset);
    setName(asset.name);
    setSymbol(asset.symbol);
    setSector(asset.sector || '');
    setSearchQuery('');
    setStep('details');
  }, []);

  const handleManualEntry = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep('details');
  }, []);

  const handleBack = useCallback(() => {
    setErrors({});
    if (step === 'details' && selectedType && SEARCHABLE_TYPES.includes(selectedType)) {
      setStep('search');
      setSelectedAsset(null);
      setApiSearchResults([]);
    } else {
      setStep('type');
      setSelectedType(null);
      setName('');
      setSymbol('');
    }
  }, [step, selectedType]);

  // ── Submit logic ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedType) return;

    // Check tier limits
    const subscriptionTier = profile?.subscription_tier || 'free';
    const limits = TIER_LIMITS[subscriptionTier];
    if (holdings.length >= limits.maxAssets) {
      Alert.alert(
        'Asset Limit Reached',
        'Upgrade to add more assets.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => { handleClose(); router.push('/paywall'); } },
        ]
      );
      return;
    }

    // Validate based on asset type
    const newErrors: Record<string, string> = {};

    if (SINGLE_VALUE_TYPES.includes(selectedType)) {
      // Real estate, cash, other → need name + value
      if (!name.trim()) newErrors.name = 'Enter a name';
      const val = parseFloat(currentValue);
      if (isNaN(val) || val <= 0) newErrors.currentValue = 'Enter a valid amount';
    } else if (selectedType === 'fixed_income_cd') {
      if (!name.trim()) newErrors.name = 'Enter a name';
      const val = parseFloat(currentValue);
      if (isNaN(val) || val <= 0) newErrors.currentValue = 'Enter a valid amount';
    } else if (selectedType === 'fixed_income_bond') {
      if (!name.trim()) newErrors.name = 'Enter a name';
      const qty = parseFloat(quantity);
      if (isNaN(qty) || qty <= 0) newErrors.quantity = 'Enter a valid quantity';
    } else {
      // Standard: stocks, ETFs, crypto, metals
      if (!name.trim() && !selectedAsset) newErrors.name = 'Enter a name';
      if (SEARCHABLE_TYPES.includes(selectedType) && !selectedAsset && !symbol.trim()) {
        newErrors.symbol = 'Enter a valid ticker symbol';
      }
      const qty = parseFloat(quantity);
      if (isNaN(qty) || qty <= 0) newErrors.quantity = 'Enter a valid amount';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const portfolio = portfolios[0];
      if (!portfolio) {
        Alert.alert('Error', 'No portfolio found. Please restart the app.');
        setIsLoading(false);
        return;
      }

      // Validate and normalize symbol for searchable assets before saving
      let canonicalSymbol = getCanonicalSymbol(selectedType, selectedAsset?.symbol || symbol);
      let finalName = name.trim() || selectedAsset?.name || '';

      if (selectedType === 'crypto') {
        const normalizedCrypto = canonicalSymbol.trim().toUpperCase();
        const resolvedCoinId = await resolveCoinGeckoId(normalizedCrypto);
        if (!resolvedCoinId) {
          setError('symbol', 'Ticker not recognized. Pick one from search results.');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Invalid Ticker', 'Crypto symbol not recognized. Search and select a listed coin.');
          return;
        }
        canonicalSymbol = normalizedCrypto;
      } else if (
        selectedType === 'stock' ||
        selectedType === 'etf' ||
        selectedType === 'mutual_fund'
      ) {
        const validated = await validateStockSymbol(canonicalSymbol, selectedType);
        if (!validated) {
          setError('symbol', 'Invalid or unsupported ticker. Use search to pick a listed symbol.');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Invalid Ticker', 'That stock ticker is invalid or unsupported by the price providers.');
          return;
        }
        canonicalSymbol = validated.symbol;
        if (!finalName) {
          finalName = validated.description || canonicalSymbol;
        }
      }

      // Build holding data based on asset type
      let holdingData: any = {
        portfolio_id: portfolio.id,
        asset_type: selectedType,
        name: finalName,
        symbol: canonicalSymbol || null,
        currency: 'USD',
        sector: sector || null,
        country: selectedAsset?.country || 'US',
        purchase_date: new Date().toISOString().split('T')[0],
        // Defaults
        manual_price: null,
        manual_price_updated_at: null,
        maturity_date: null,
        interest_rate: null,
        payment_frequency: null,
        property_address: null,
        property_type: null,
        last_valuation_date: null,
        notes: null,
      };

      if (SINGLE_VALUE_TYPES.includes(selectedType)) {
        // Real estate, cash, other: quantity=1, manual_price=value
        const val = parseFloat(currentValue);
        const purchasePriceVal = parseFloat(purchasePrice);
        holdingData.quantity = 1;
        holdingData.manual_price = val;
        holdingData.manual_price_updated_at = new Date().toISOString();
        holdingData.cost_basis = !isNaN(purchasePriceVal) && purchasePriceVal > 0 ? purchasePriceVal : val;

        if (selectedType === 'real_estate') {
          holdingData.property_type = propertyType;
          holdingData.property_address = propertyAddress.trim() || null;
          holdingData.last_valuation_date = new Date().toISOString().split('T')[0];
        }

        if (interestRate) {
          holdingData.interest_rate = parseFloat(interestRate) || null;
        }
      } else if (selectedType === 'fixed_income_cd') {
        // CD: quantity=1, amount is the deposit
        const val = parseFloat(currentValue);
        holdingData.quantity = 1;
        holdingData.manual_price = val;
        holdingData.manual_price_updated_at = new Date().toISOString();
        holdingData.cost_basis = val;
        holdingData.interest_rate = parseFloat(interestRate) || null;
        holdingData.maturity_date = maturityDate || null;
        holdingData.payment_frequency = paymentFrequency;
      } else if (selectedType === 'fixed_income_bond') {
        // Bonds: quantity = number of bonds, cost_basis = price per bond
        const qty = parseFloat(quantity);
        const price = parseFloat(purchasePrice);
        holdingData.quantity = qty;
        holdingData.cost_basis = !isNaN(price) && price > 0 ? price : null;
        holdingData.interest_rate = parseFloat(interestRate) || null;
        holdingData.maturity_date = maturityDate || null;
        holdingData.payment_frequency = paymentFrequency;
      } else {
        // Standard traded assets: stocks, ETFs, crypto, metals
        const qty = parseFloat(quantity);
        holdingData.quantity = qty;

        if (purchasePrice) {
          if (costMode === 'total') {
            // User entered total → calculate per-unit
            const total = parseFloat(purchasePrice);
            holdingData.cost_basis = !isNaN(total) && total > 0 ? total / qty : null;
          } else {
            holdingData.cost_basis = parseFloat(purchasePrice) || null;
          }
        } else {
          holdingData.cost_basis = null;
        }
      }

      await addHolding(holdingData);
      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error('Error adding holding:', error);
      Alert.alert('Error', 'Failed to add asset. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const showSearchResults = searchQuery.length > 0 && searchResults.length > 0;
  const showNoResults = searchQuery.length > 1 && searchResults.length === 0 && !isApiSearching;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          {step !== 'type' ? (
            <TouchableOpacity onPress={handleBack} style={styles.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-back" size={28} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerBtn} />
          )}
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {step === 'type' ? 'Add Asset' :
             step === 'search' ? (typeConfig?.label || 'Search') :
             selectedAsset ? selectedAsset.symbol : 'Details'}
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* ──── Step 1: Type Selection ──── */}
          {step === 'type' && (
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
              {ASSET_CATEGORIES.map((category) => (
                <View key={category.title}>
                  <Text style={[styles.categoryTitle, { color: colors.textSecondary }]}>
                    {category.title}
                  </Text>
                  <View style={styles.typeList}>
                    {category.items.map((item) => (
                      <TouchableOpacity
                        key={item.type}
                        style={[styles.typeRow, { backgroundColor: colors.card }]}
                        onPress={() => handleSelectType(item.type)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.typeIconBox, { backgroundColor: item.color + '15' }]}>
                          <Ionicons name={item.icon} size={22} color={item.color} />
                        </View>
                        <Text style={[styles.typeRowLabel, { color: colors.text }]}>{item.label}</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {/* ──── Step 2: Search & Select ──── */}
          {step === 'search' && (
            <View style={styles.searchContainer}>
              <View style={styles.searchBox}>
                <View style={[styles.searchInputRow, { backgroundColor: colors.backgroundSecondary }]}>
                  <Ionicons name="search" size={20} color={colors.textTertiary} />
                  <TextInput
                    style={[styles.searchTextInput, { color: colors.text }]}
                    placeholder="Search by name or ticker..."
                    placeholderTextColor={colors.textTertiary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {/* Search Results */}
                {showSearchResults && (
                  <View style={styles.resultsList}>
                    {searchResults.map((asset) => (
                      <TouchableOpacity
                        key={asset.symbol}
                        style={[styles.resultRow, { backgroundColor: colors.card }]}
                        onPress={() => handleSelectAsset(asset)}
                      >
                        <View style={[styles.resultIcon, { backgroundColor: typeConfig?.color + '15' }]}>
                          <Text style={[styles.resultSymbolLetter, { color: typeConfig?.color }]}>
                            {asset.symbol.charAt(0)}
                          </Text>
                        </View>
                        <View style={styles.resultInfo}>
                          <Text style={[styles.resultSymbol, { color: colors.text }]}>
                            {asset.symbol}
                          </Text>
                          <Text style={[styles.resultName, { color: colors.textSecondary }]} numberOfLines={1}>
                            {asset.name}
                          </Text>
                        </View>
                        <Ionicons name="add-circle" size={28} color={colors.primary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Live search loading state */}
                {isApiSearching && searchQuery.length > 1 && !showSearchResults && (
                  <View style={styles.searchLoading}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.searchLoadingText, { color: colors.textSecondary }]}>
                      Searching live market symbols...
                    </Text>
                  </View>
                )}

                {/* No Results */}
                {showNoResults && (
                  <View style={styles.noResults}>
                    <Ionicons name="search-outline" size={32} color={colors.textTertiary} />
                    <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
                      No results for "{searchQuery}"
                    </Text>
                    <TouchableOpacity
                      style={[styles.noResultsBtn, { backgroundColor: colors.primary }]}
                      onPress={handleManualEntry}
                    >
                      <Ionicons name="add" size={18} color="#FFF" />
                      <Text style={styles.noResultsBtnText}>Add Manually</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Popular Section */}
                {!showSearchResults && !showNoResults && featuredAssets.length > 0 && (
                  <>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                      POPULAR
                    </Text>
                    <View style={styles.resultsList}>
                      {featuredAssets.map((asset) => (
                        <TouchableOpacity
                          key={asset.symbol}
                          style={[styles.resultRow, { backgroundColor: colors.card }]}
                          onPress={() => handleSelectAsset(asset)}
                        >
                          <View style={[styles.resultIcon, { backgroundColor: typeConfig?.color + '15' }]}>
                            <Text style={[styles.resultSymbolLetter, { color: typeConfig?.color }]}>
                              {asset.symbol.charAt(0)}
                            </Text>
                          </View>
                          <View style={styles.resultInfo}>
                            <Text style={[styles.resultSymbol, { color: colors.text }]}>
                              {asset.symbol}
                            </Text>
                            <Text style={[styles.resultName, { color: colors.textSecondary }]} numberOfLines={1}>
                              {asset.name}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                {/* Manual Entry */}
                <TouchableOpacity
                  style={[styles.manualRow, { borderColor: colors.border }]}
                  onPress={handleManualEntry}
                >
                  <View style={[styles.manualIcon, { backgroundColor: colors.backgroundSecondary }]}>
                    <Ionicons name="create-outline" size={20} color={colors.primary} />
                  </View>
                  <Text style={[styles.manualText, { color: colors.text }]}>
                    Add custom asset
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}

          {/* ──── Step 3: Dynamic Details Form ──── */}
          {step === 'details' && (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Selected asset card (from search) */}
              {selectedAsset && (
                <View style={[styles.selectedCard, { backgroundColor: colors.card }]}>
                  <View style={[styles.selectedIcon, { backgroundColor: typeConfig?.color + '15' }]}>
                    <Ionicons name={typeConfig?.icon || 'cube'} size={24} color={typeConfig?.color} />
                  </View>
                  <View style={styles.selectedInfo}>
                    <Text style={[styles.selectedSymbol, { color: colors.text }]}>{selectedAsset.symbol}</Text>
                    <Text style={[styles.selectedName, { color: colors.textSecondary }]}>{selectedAsset.name}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => { setSelectedAsset(null); setStep('search'); }}
                    style={[styles.changeBtn, { backgroundColor: colors.backgroundSecondary }]}
                  >
                    <Text style={[styles.changeBtnText, { color: colors.primary }]}>Change</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ── Dynamic form based on asset type ── */}

              {/* ──── STOCKS / ETFs / MUTUAL FUNDS / CRYPTO ──── */}
              {selectedType && !SINGLE_VALUE_TYPES.includes(selectedType) && selectedType !== 'fixed_income_cd' && (
                <>
                  {/* Name (manual entry only) */}
                  {!selectedAsset && (
                    <FormField
                      label="Asset Name"
                      error={errors.name}
                      colors={colors}
                    >
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: errors.name ? colors.error : colors.border }]}
                        placeholder={selectedType === 'fixed_income_bond' ? 'e.g., US Treasury 10Y' : selectedType === 'commodity_gold' ? 'Gold' : 'e.g., Apple Inc.'}
                        placeholderTextColor={colors.textTertiary}
                        value={name}
                        onChangeText={(t) => { setName(t); clearError('name'); }}
                      />
                    </FormField>
                  )}

                  {/* Symbol (manual entry for searchable types) */}
                  {!selectedAsset && SEARCHABLE_TYPES.includes(selectedType) && (
                    <FormField label="Ticker Symbol" error={errors.symbol} colors={colors}>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: errors.symbol ? colors.error : colors.border }]}
                        placeholder="e.g., AAPL"
                        placeholderTextColor={colors.textTertiary}
                        value={symbol}
                        onChangeText={(t) => { setSymbol(t.toUpperCase()); clearError('symbol'); }}
                        autoCapitalize="characters"
                      />
                    </FormField>
                  )}

                  {/* Quantity */}
                  <FormField
                    label={formConfig?.qtyLabel || 'Quantity'}
                    error={errors.quantity}
                    colors={colors}
                  >
                    <TextInput
                      style={[styles.input, styles.inputLarge, { backgroundColor: colors.card, color: colors.text, borderColor: errors.quantity ? colors.error : colors.border }]}
                      placeholder="0"
                      placeholderTextColor={colors.textTertiary}
                      value={quantity}
                      onChangeText={(t) => { setQuantity(t); clearError('quantity'); }}
                      keyboardType="decimal-pad"
                      autoFocus={!!selectedAsset}
                    />
                  </FormField>

                  {/* Cost mode toggle */}
                  <View style={styles.toggleRow}>
                    <TouchableOpacity
                      style={[
                        styles.toggleBtn,
                        costMode === 'perUnit' && { backgroundColor: colors.primary },
                        costMode !== 'perUnit' && { backgroundColor: colors.backgroundSecondary },
                      ]}
                      onPress={() => { setCostMode('perUnit'); setPurchasePrice(''); }}
                    >
                      <Text style={[styles.toggleText, { color: costMode === 'perUnit' ? '#FFF' : colors.textSecondary }]}>
                        Per {formConfig?.unit || 'unit'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.toggleBtn,
                        costMode === 'total' && { backgroundColor: colors.primary },
                        costMode !== 'total' && { backgroundColor: colors.backgroundSecondary },
                      ]}
                      onPress={() => { setCostMode('total'); setPurchasePrice(''); }}
                    >
                      <Text style={[styles.toggleText, { color: costMode === 'total' ? '#FFF' : colors.textSecondary }]}>
                        Total invested
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Price field */}
                  <FormField
                    label={costMode === 'total' ? 'Total Amount Invested' : (formConfig?.priceLabel || 'Price per Unit')}
                    hint="Optional - add later if unsure"
                    colors={colors}
                  >
                    <View style={[styles.inputWithIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>$</Text>
                      <TextInput
                        style={[styles.inputNoBorder, { color: colors.text }]}
                        placeholder="0.00"
                        placeholderTextColor={colors.textTertiary}
                        value={purchasePrice}
                        onChangeText={setPurchasePrice}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </FormField>

                  {/* Cost summary */}
                  {costSummary && (
                    <View style={[styles.summaryCard, { backgroundColor: colors.backgroundSecondary }]}>
                      <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                          {costMode === 'total' ? 'Cost per ' + (formConfig?.unit || 'unit') : 'Total Cost Basis'}
                        </Text>
                        <Text style={[styles.summaryValue, { color: colors.text }]}>
                          {formatCurrency(costMode === 'total' ? costSummary.perUnit : costSummary.total)}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Extra fields for bonds */}
                  {selectedType === 'fixed_income_bond' && (
                    <>
                      <FormField label="Interest Rate (%)" hint="Annual coupon rate" colors={colors}>
                        <View style={[styles.inputWithIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
                          <TextInput
                            style={[styles.inputNoBorder, { color: colors.text }]}
                            placeholder="5.25"
                            placeholderTextColor={colors.textTertiary}
                            value={interestRate}
                            onChangeText={setInterestRate}
                            keyboardType="decimal-pad"
                          />
                          <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>%</Text>
                        </View>
                      </FormField>
                      <FormField label="Maturity Date" hint="YYYY-MM-DD" colors={colors}>
                        <TextInput
                          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                          placeholder="2030-01-15"
                          placeholderTextColor={colors.textTertiary}
                          value={maturityDate}
                          onChangeText={setMaturityDate}
                          keyboardType="numbers-and-punctuation"
                        />
                      </FormField>
                      <FormField label="Payment Frequency" colors={colors}>
                        <FrequencyPicker
                          value={paymentFrequency}
                          onChange={setPaymentFrequency}
                          colors={colors}
                        />
                      </FormField>
                    </>
                  )}
                </>
              )}

              {/* ──── CD FORM ──── */}
              {selectedType === 'fixed_income_cd' && (
                <>
                  <FormField label="CD Name" error={errors.name} colors={colors}>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: errors.name ? colors.error : colors.border }]}
                      placeholder="e.g., Chase 12-Month CD"
                      placeholderTextColor={colors.textTertiary}
                      value={name}
                      onChangeText={(t) => { setName(t); clearError('name'); }}
                      autoFocus
                    />
                  </FormField>
                  <FormField label="Amount Deposited" error={errors.currentValue} colors={colors}>
                    <View style={[styles.inputWithIcon, { backgroundColor: colors.card, borderColor: errors.currentValue ? colors.error : colors.border }]}>
                      <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>$</Text>
                      <TextInput
                        style={[styles.inputNoBorder, styles.inputLargeInline, { color: colors.text }]}
                        placeholder="10,000"
                        placeholderTextColor={colors.textTertiary}
                        value={currentValue}
                        onChangeText={(t) => { setCurrentValue(t); clearError('currentValue'); }}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </FormField>
                  <FormField label="APY (%)" colors={colors}>
                    <View style={[styles.inputWithIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <TextInput
                        style={[styles.inputNoBorder, { color: colors.text }]}
                        placeholder="4.50"
                        placeholderTextColor={colors.textTertiary}
                        value={interestRate}
                        onChangeText={setInterestRate}
                        keyboardType="decimal-pad"
                      />
                      <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>%</Text>
                    </View>
                  </FormField>
                  <FormField label="Maturity Date" hint="YYYY-MM-DD" colors={colors}>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                      placeholder="2026-02-15"
                      placeholderTextColor={colors.textTertiary}
                      value={maturityDate}
                      onChangeText={setMaturityDate}
                      keyboardType="numbers-and-punctuation"
                    />
                  </FormField>
                  <FormField label="Payment Frequency" colors={colors}>
                    <FrequencyPicker
                      value={paymentFrequency}
                      onChange={setPaymentFrequency}
                      colors={colors}
                    />
                  </FormField>
                </>
              )}

              {/* ──── REAL ESTATE FORM ──── */}
              {selectedType === 'real_estate' && (
                <>
                  <FormField label="Property Name" error={errors.name} colors={colors}>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: errors.name ? colors.error : colors.border }]}
                      placeholder="e.g., Downtown Condo"
                      placeholderTextColor={colors.textTertiary}
                      value={name}
                      onChangeText={(t) => { setName(t); clearError('name'); }}
                      autoFocus
                    />
                  </FormField>
                  <FormField label="Current Value" error={errors.currentValue} colors={colors}>
                    <View style={[styles.inputWithIcon, { backgroundColor: colors.card, borderColor: errors.currentValue ? colors.error : colors.border }]}>
                      <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>$</Text>
                      <TextInput
                        style={[styles.inputNoBorder, styles.inputLargeInline, { color: colors.text }]}
                        placeholder="350,000"
                        placeholderTextColor={colors.textTertiary}
                        value={currentValue}
                        onChangeText={(t) => { setCurrentValue(t); clearError('currentValue'); }}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </FormField>
                  <FormField label="Purchase Price" hint="Optional" colors={colors}>
                    <View style={[styles.inputWithIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>$</Text>
                      <TextInput
                        style={[styles.inputNoBorder, { color: colors.text }]}
                        placeholder="300,000"
                        placeholderTextColor={colors.textTertiary}
                        value={purchasePrice}
                        onChangeText={setPurchasePrice}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </FormField>
                  <FormField label="Property Type" colors={colors}>
                    <PropertyTypePicker
                      value={propertyType}
                      onChange={setPropertyType}
                      colors={colors}
                    />
                  </FormField>
                  <FormField label="Address" hint="Optional" colors={colors}>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                      placeholder="123 Main St, City, State"
                      placeholderTextColor={colors.textTertiary}
                      value={propertyAddress}
                      onChangeText={setPropertyAddress}
                    />
                  </FormField>
                </>
              )}

              {/* ──── CASH / SAVINGS FORM ──── */}
              {selectedType === 'cash' && (
                <>
                  <FormField label="Account Name" error={errors.name} colors={colors}>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: errors.name ? colors.error : colors.border }]}
                      placeholder="e.g., Emergency Fund, HYSA"
                      placeholderTextColor={colors.textTertiary}
                      value={name}
                      onChangeText={(t) => { setName(t); clearError('name'); }}
                      autoFocus
                    />
                  </FormField>
                  <FormField label="Balance" error={errors.currentValue} colors={colors}>
                    <View style={[styles.inputWithIcon, { backgroundColor: colors.card, borderColor: errors.currentValue ? colors.error : colors.border }]}>
                      <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>$</Text>
                      <TextInput
                        style={[styles.inputNoBorder, styles.inputLargeInline, { color: colors.text }]}
                        placeholder="25,000"
                        placeholderTextColor={colors.textTertiary}
                        value={currentValue}
                        onChangeText={(t) => { setCurrentValue(t); clearError('currentValue'); }}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </FormField>
                  <FormField label="Interest Rate (APY %)" hint="Optional" colors={colors}>
                    <View style={[styles.inputWithIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <TextInput
                        style={[styles.inputNoBorder, { color: colors.text }]}
                        placeholder="4.25"
                        placeholderTextColor={colors.textTertiary}
                        value={interestRate}
                        onChangeText={setInterestRate}
                        keyboardType="decimal-pad"
                      />
                      <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>%</Text>
                    </View>
                  </FormField>
                </>
              )}

              {/* ──── OTHER ASSET FORM ──── */}
              {selectedType === 'other' && (
                <>
                  <FormField label="Asset Name" error={errors.name} colors={colors}>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: errors.name ? colors.error : colors.border }]}
                      placeholder="e.g., Art Collection, Vintage Watch"
                      placeholderTextColor={colors.textTertiary}
                      value={name}
                      onChangeText={(t) => { setName(t); clearError('name'); }}
                      autoFocus
                    />
                  </FormField>
                  <FormField label="Current Value" error={errors.currentValue} colors={colors}>
                    <View style={[styles.inputWithIcon, { backgroundColor: colors.card, borderColor: errors.currentValue ? colors.error : colors.border }]}>
                      <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>$</Text>
                      <TextInput
                        style={[styles.inputNoBorder, styles.inputLargeInline, { color: colors.text }]}
                        placeholder="5,000"
                        placeholderTextColor={colors.textTertiary}
                        value={currentValue}
                        onChangeText={(t) => { setCurrentValue(t); clearError('currentValue'); }}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </FormField>
                  <FormField label="Purchase Price" hint="Optional" colors={colors}>
                    <View style={[styles.inputWithIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>$</Text>
                      <TextInput
                        style={[styles.inputNoBorder, { color: colors.text }]}
                        placeholder="3,500"
                        placeholderTextColor={colors.textTertiary}
                        value={purchasePrice}
                        onChangeText={setPurchasePrice}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </FormField>
                </>
              )}

              {/* Submit */}
              <View style={styles.submitSection}>
                <Button
                  title="Add to Portfolio"
                  onPress={handleSubmit}
                  loading={isLoading}
                  fullWidth
                  size="lg"
                />
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function FormField({
  label,
  hint,
  error,
  colors,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  colors: any;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
        {hint && <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>{hint}</Text>}
      </View>
      {children}
      {error && (
        <Text style={[styles.fieldError, { color: colors.error }]}>{error}</Text>
      )}
    </View>
  );
}

function FrequencyPicker({
  value,
  onChange,
  colors,
}: {
  value: 'monthly' | 'quarterly' | 'annually';
  onChange: (v: 'monthly' | 'quarterly' | 'annually') => void;
  colors: any;
}) {
  const options: { label: string; value: 'monthly' | 'quarterly' | 'annually' }[] = [
    { label: 'Monthly', value: 'monthly' },
    { label: 'Quarterly', value: 'quarterly' },
    { label: 'Annually', value: 'annually' },
  ];
  return (
    <View style={styles.segmentRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.segmentBtn,
            { backgroundColor: value === opt.value ? colors.primary : colors.card, borderColor: colors.border },
          ]}
          onPress={() => onChange(opt.value)}
        >
          <Text style={[styles.segmentText, { color: value === opt.value ? '#FFF' : colors.text }]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function PropertyTypePicker({
  value,
  onChange,
  colors,
}: {
  value: 'residential' | 'commercial' | 'land';
  onChange: (v: 'residential' | 'commercial' | 'land') => void;
  colors: any;
}) {
  const options: { label: string; icon: keyof typeof Ionicons.glyphMap; value: 'residential' | 'commercial' | 'land' }[] = [
    { label: 'Residential', icon: 'home-outline', value: 'residential' },
    { label: 'Commercial', icon: 'business-outline', value: 'commercial' },
    { label: 'Land', icon: 'map-outline', value: 'land' },
  ];
  return (
    <View style={styles.segmentRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.segmentBtn,
            { backgroundColor: value === opt.value ? colors.primary : colors.card, borderColor: colors.border },
          ]}
          onPress={() => onChange(opt.value)}
        >
          <Ionicons name={opt.icon} size={16} color={value === opt.value ? '#FFF' : colors.textSecondary} />
          <Text style={[styles.segmentText, { color: value === opt.value ? '#FFF' : colors.text, marginLeft: 4 }]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },

  // Categories
  categoryTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  typeList: { gap: Spacing.xs },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  typeIconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeRowLabel: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },

  // Search
  searchContainer: { flex: 1 },
  searchBox: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    height: 48,
    gap: Spacing.sm,
  },
  searchTextInput: { flex: 1, fontSize: FontSize.md },

  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },

  resultsList: { gap: Spacing.xs },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  resultIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultSymbolLetter: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  resultInfo: { flex: 1 },
  resultSymbol: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  resultName: { fontSize: FontSize.sm, marginTop: 2 },
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  searchLoadingText: { fontSize: FontSize.sm },

  noResults: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  noResultsText: { fontSize: FontSize.sm },
  noResultsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: 4,
    marginTop: Spacing.sm,
  },
  noResultsBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  manualIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualText: { flex: 1, fontSize: FontSize.md, fontWeight: FontWeight.medium },

  // Selected card
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  selectedIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedInfo: { flex: 1 },
  selectedSymbol: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  selectedName: { fontSize: FontSize.sm, marginTop: 2 },
  changeBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  changeBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  // Form fields
  field: { marginBottom: Spacing.md },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: Spacing.xs,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  fieldHint: {
    fontSize: FontSize.xs,
  },
  fieldError: {
    fontSize: FontSize.xs,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
  },
  inputLarge: {
    fontSize: FontSize.xxl,
    paddingVertical: Spacing.lg,
    textAlign: 'center',
    fontWeight: FontWeight.semibold,
  },
  inputLargeInline: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
  },
  currencySymbol: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
    marginRight: Spacing.xs,
  },
  inputNoBorder: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
  },

  // Toggle (per unit / total)
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },

  // Segmented pickers
  segmentRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  segmentText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },

  // Summary
  summaryCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: { fontSize: FontSize.sm },
  summaryValue: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold },

  submitSection: { marginTop: Spacing.lg },
});

export default AddAssetSheet;
