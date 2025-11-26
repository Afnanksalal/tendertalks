// Client-side API functions for payments
import type { Purchase, Subscription, PricingPlan } from '../db/schema';

// Create order for purchase or subscription
export async function createOrder(data: {
  amount: number;
  currency?: string;
  podcastId?: string;
  planId?: string;
  type: 'purchase' | 'subscription';
}): Promise<{ orderId: string; amount: number; currency: string }> {
  const response = await fetch('/api/payments/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create order');
  }

  return response.json();
}

// Verify payment
export async function verifyPayment(data: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  type: 'purchase' | 'subscription';
  podcastId?: string;
  planId?: string;
}): Promise<{ success: boolean }> {
  const response = await fetch('/api/payments/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Payment verification failed');
  }

  return response.json();
}

// Get user purchases
export async function getUserPurchases(): Promise<Purchase[]> {
  const response = await fetch('/api/users/purchases');
  if (!response.ok) return [];
  return response.json();
}

// Get user subscription
export async function getUserSubscription(): Promise<(Subscription & { plan?: PricingPlan }) | null> {
  const response = await fetch('/api/users/subscription');
  if (!response.ok) return null;
  return response.json();
}

// Get all pricing plans
export async function getPricingPlans(): Promise<PricingPlan[]> {
  const response = await fetch('/api/pricing-plans');
  if (!response.ok) return [];
  return response.json();
}

// Cancel subscription
export async function cancelSubscription(): Promise<{ success: boolean }> {
  const response = await fetch('/api/users/subscription/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Failed to cancel subscription');
  }

  return response.json();
}
