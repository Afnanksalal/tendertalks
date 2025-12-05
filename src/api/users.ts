// Client-side API wrapper for user operations
// All database operations happen in serverless API routes

const API_BASE = '/api/users';

// Sync user from Supabase Auth to our database
export async function syncUser(data: {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}) {
  const response = await fetch(`${API_BASE}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to sync user');
  }

  return response.json();
}

// Get user subscription status
export async function getUserSubscription(authHeaders: Record<string, string>) {
  const response = await fetch(`${API_BASE}/subscription`, {
    headers: authHeaders,
  });

  if (!response.ok) {
    throw new Error('Failed to get subscription');
  }

  return response.json();
}

// Get user purchases
export async function getUserPurchases(authHeaders: Record<string, string>) {
  const response = await fetch(`${API_BASE}/purchases`, {
    headers: authHeaders,
  });

  if (!response.ok) {
    throw new Error('Failed to get purchases');
  }

  return response.json();
}

// Get user downloads
export async function getUserDownloads(authHeaders: Record<string, string>) {
  const response = await fetch(`${API_BASE}/downloads`, {
    headers: authHeaders,
  });

  if (!response.ok) {
    throw new Error('Failed to get downloads');
  }

  return response.json();
}

// Update user profile
export async function updateUserProfile(
  authHeaders: Record<string, string>,
  data: {
    name?: string;
    avatarUrl?: string;
  }
) {
  const response = await fetch(`${API_BASE}/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to update profile');
  }

  return response.json();
}

// Get play history
export async function getPlayHistory(authHeaders: Record<string, string>) {
  const response = await fetch(`${API_BASE}/history`, {
    headers: authHeaders,
  });

  if (!response.ok) {
    return [];
  }

  return response.json();
}

// Cancel subscription
export async function cancelSubscription(authHeaders: Record<string, string>) {
  const response = await fetch(`${API_BASE}/subscription/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to cancel subscription');
  }

  return response.json();
}
