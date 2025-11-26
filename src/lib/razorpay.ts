// Razorpay client-side integration
declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    backdropclose?: boolean;
  };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// Load Razorpay script with caching
let scriptLoaded = false;
let scriptLoading: Promise<boolean> | null = null;

export function loadRazorpayScript(): Promise<boolean> {
  if (scriptLoaded && window.Razorpay) {
    return Promise.resolve(true);
  }

  if (scriptLoading) {
    return scriptLoading;
  }

  scriptLoading = new Promise((resolve) => {
    if (window.Razorpay) {
      scriptLoaded = true;
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      scriptLoaded = true;
      resolve(true);
    };
    script.onerror = () => {
      scriptLoading = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return scriptLoading;
}

// Initialize Razorpay payment
export async function initiatePayment(options: RazorpayOptions): Promise<void> {
  const loaded = await loadRazorpayScript();
  
  if (!loaded) {
    throw new Error('Failed to load Razorpay SDK. Please check your internet connection.');
  }

  return new Promise((resolve, reject) => {
    const razorpay = new window.Razorpay({
      ...options,
      modal: {
        ...options.modal,
        escape: options.modal?.escape ?? true,
        backdropclose: options.modal?.backdropclose ?? false,
      },
      handler: (response: RazorpayResponse) => {
        options.handler(response);
        resolve();
      },
    });

    razorpay.on('payment.failed', (response: any) => {
      reject(new Error(response.error?.description || 'Payment failed'));
    });

    razorpay.open();
  });
}

// Create order via API
export async function createOrder(data: {
  amount: number;
  currency?: string;
  podcastId?: string;
  planId?: string;
  type: 'purchase' | 'subscription';
  userId?: string;
}): Promise<{ orderId: string; amount: number; currency: string; key: string }> {
  const response = await fetch('/api/payments/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create order' }));
    throw new Error(error.error || error.message || 'Failed to create order');
  }

  return response.json();
}

// Verify payment via API
export async function verifyPayment(data: RazorpayResponse & {
  type: 'purchase' | 'subscription';
  podcastId?: string;
  planId?: string;
  userId: string;
}): Promise<{ success: boolean }> {
  const response = await fetch('/api/payments/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Payment verification failed' }));
    throw new Error(error.error || error.message || 'Payment verification failed');
  }

  return response.json();
}
