// Alerts Service - CRUD operations for price alerts
import { supabase } from './supabase';
import { Alert, AlertType } from '@/types/database';

// Extended Alert type with holding info for UI
export interface AlertWithHolding extends Alert {
  holding_name: string;
  holding_symbol: string | null;
  current_price: number;
}

// Input type for creating alerts
export interface CreateAlertInput {
  holding_id: string;
  alert_type: AlertType;
  target_value?: number;
  target_date?: string;
}

// Input type for updating alerts
export interface UpdateAlertInput {
  is_active?: boolean;
  target_value?: number;
  target_date?: string;
  triggered_at?: string | null;
}

/**
 * Fetch all alerts for the current user with holding details
 */
export async function getAlerts(): Promise<AlertWithHolding[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('alerts')
    .select(`
      *,
      holdings (
        name,
        symbol,
        manual_price,
        asset_type
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching alerts:', error);
    return [];
  }

  // Transform to include holding info and price
  return (data || []).map((alert: any) => ({
    ...alert,
    holding_name: alert.holdings?.name || 'Unknown',
    holding_symbol: alert.holdings?.symbol || null,
    current_price: alert.holdings?.manual_price || 0,
  }));
}

/**
 * Get a single alert by ID
 */
export async function getAlert(alertId: string): Promise<AlertWithHolding | null> {
  const { data, error } = await supabase
    .from('alerts')
    .select(`
      *,
      holdings (
        name,
        symbol,
        manual_price
      )
    `)
    .eq('id', alertId)
    .single();

  if (error || !data) {
    console.error('Error fetching alert:', error);
    return null;
  }

  return {
    ...data,
    holding_name: data.holdings?.name || 'Unknown',
    holding_symbol: data.holdings?.symbol || null,
    current_price: data.holdings?.manual_price || 0,
  };
}

/**
 * Create a new alert
 */
export async function createAlert(input: CreateAlertInput): Promise<Alert | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('alerts')
    .insert({
      user_id: user.id,
      holding_id: input.holding_id,
      alert_type: input.alert_type,
      target_value: input.target_value || null,
      target_date: input.target_date || null,
      is_active: true,
      triggered_at: null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating alert:', error);
    return null;
  }

  return data;
}

/**
 * Update an existing alert
 */
export async function updateAlert(
  alertId: string,
  input: UpdateAlertInput
): Promise<Alert | null> {
  const { data, error } = await supabase
    .from('alerts')
    .update(input)
    .eq('id', alertId)
    .select()
    .single();

  if (error) {
    console.error('Error updating alert:', error);
    return null;
  }

  return data;
}

/**
 * Toggle alert active state
 */
export async function toggleAlertActive(alertId: string, isActive: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('alerts')
    .update({ is_active: isActive })
    .eq('id', alertId);

  if (error) {
    console.error('Error toggling alert:', error);
    return false;
  }

  return true;
}

/**
 * Delete an alert
 */
export async function deleteAlert(alertId: string): Promise<boolean> {
  const { error } = await supabase
    .from('alerts')
    .delete()
    .eq('id', alertId);

  if (error) {
    console.error('Error deleting alert:', error);
    return false;
  }

  return true;
}

/**
 * Mark an alert as triggered
 */
export async function markAlertTriggered(alertId: string): Promise<boolean> {
  const { error } = await supabase
    .from('alerts')
    .update({
      triggered_at: new Date().toISOString(),
      is_active: false,
    })
    .eq('id', alertId);

  if (error) {
    console.error('Error marking alert triggered:', error);
    return false;
  }

  return true;
}

/**
 * Get count of active alerts for subscription limit checking
 */
export async function getActiveAlertsCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (error) {
    console.error('Error counting alerts:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Check alerts against current prices
 * Returns alerts that should be triggered
 */
export async function checkAlertsForTrigger(
  priceMap: Map<string, number>
): Promise<AlertWithHolding[]> {
  const alerts = await getAlerts();
  const triggeredAlerts: AlertWithHolding[] = [];

  for (const alert of alerts) {
    if (!alert.is_active || alert.triggered_at) continue;

    const symbol = alert.holding_symbol;
    if (!symbol || !alert.target_value) continue;

    const currentPrice = priceMap.get(symbol) || alert.current_price;
    if (!currentPrice) continue;

    let shouldTrigger = false;

    if (alert.alert_type === 'price_above' && currentPrice >= alert.target_value) {
      shouldTrigger = true;
    } else if (alert.alert_type === 'price_below' && currentPrice <= alert.target_value) {
      shouldTrigger = true;
    } else if (alert.alert_type === 'maturity' && alert.target_date) {
      const today = new Date();
      const maturityDate = new Date(alert.target_date);
      // Trigger 7 days before maturity
      const daysUntilMaturity = Math.ceil(
        (maturityDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilMaturity <= 7 && daysUntilMaturity >= 0) {
        shouldTrigger = true;
      }
    }

    if (shouldTrigger) {
      triggeredAlerts.push({ ...alert, current_price: currentPrice });
    }
  }

  return triggeredAlerts;
}
