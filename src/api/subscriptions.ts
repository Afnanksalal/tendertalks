// Client-side API functions for subscription management
import type { Subscription, PricingPlan } from '../db/schema';

export interface SubscriptionWithDetails extends Subscription {
  plan: PricingPlan;
  pendingPlan?: PricingPlan | null;
  canRequestRefund: boolean;
  refundWindowDays: number;
  daysUntilRefundExpires: number;
  hasPendingRefund: boolean;
  isExpired: boolean;
  daysRemaining: number;
}

export interface CreateSubscriptionResponse {
  orderId?: string;
  amount?: number;
  currency?: string;
  key?: string;
  planId: string;
  planName: string;
  refundWindowDays?: number;
  success?: boolean;
  subscription?: Subscription;
  isFree?: boolean;
}

export interface ChangeSubscriptionResponse {
  requiresPayment: boolean;
  action: 'upgrade' | 'downgrade';
  orderId?: string;
  amount?: number;
  currency?: string;
  key?: string;
  planId?: string;
  planName?: string;
  credit?: string;
  originalPrice?: number;
  effectiveDate?: string;
  message: string;
  success?: boolean;
}

// Create new subscription
export async function createSubscription(
  authHeaders: Record<string, string>,
  planId: string
): Promise<CreateSubscriptionResponse> {
  const response = await fetch('/api/subscriptions/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ planId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create subscription' }));
    throw new Error(error.error || 'Failed to create subscription');
  }

  return response.json();
}

// Verify subscription payment
export async function verifySubscription(
  authHeaders: Record<string, string>,
  data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    planId: string;
    action?: 'new' | 'upgrade' | 'downgrade';
  }
): Promise<{ success: boolean; subscription?: SubscriptionWithDetails; message: string }> {
  const response = await fetch('/api/subscriptions/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Verification failed' }));
    throw new Error(error.error || 'Verification failed');
  }

  return response.json();
}

// Change subscription (upgrade/downgrade)
export async function changeSubscription(
  authHeaders: Record<string, string>,
  newPlanId: string
): Promise<ChangeSubscriptionResponse> {
  const response = await fetch('/api/subscriptions/change', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ newPlanId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to change subscription' }));
    throw new Error(error.error || 'Failed to change subscription');
  }

  return response.json();
}

// Cancel subscription
export async function cancelSubscription(
  authHeaders: Record<string, string>,
  options?: { immediate?: boolean; reason?: string }
): Promise<{
  success: boolean;
  message: string;
  effectiveDate?: string;
  canRequestRefund: boolean;
  refundWindowDays: number;
  daysRemaining: number;
}> {
  const response = await fetch('/api/subscriptions/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(options || {}),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to cancel subscription' }));
    throw new Error(error.error || 'Failed to cancel subscription');
  }

  return response.json();
}

// Reactivate cancelled subscription
export async function reactivateSubscription(
  authHeaders: Record<string, string>
): Promise<{ success: boolean; message: string }> {
  const response = await fetch('/api/subscriptions/reactivate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: 'Failed to reactivate subscription' }));
    throw new Error(error.error || 'Failed to reactivate subscription');
  }

  return response.json();
}

// Request refund
export async function requestRefund(
  authHeaders: Record<string, string>,
  data: {
    subscriptionId?: string;
    purchaseId?: string;
    reason?: string;
  }
): Promise<{ success: boolean; message: string }> {
  const response = await fetch('/api/refunds/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to request refund' }));
    throw new Error(error.error || 'Failed to request refund');
  }

  return response.json();
}

// Get user subscription
export async function getUserSubscription(
  authHeaders: Record<string, string>
): Promise<SubscriptionWithDetails | null> {
  const response = await fetch('/api/users/subscription', {
    headers: authHeaders,
  });
  if (!response.ok) return null;
  return response.json();
}

// Get all pricing plans
export async function getPricingPlans(): Promise<PricingPlan[]> {
  const response = await fetch('/api/pricing-plans');
  if (!response.ok) return [];
  return response.json();
}
