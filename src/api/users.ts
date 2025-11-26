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
export async function getUserSubscription(userId: string) {
  const response = await fetch(`${API_BASE}/subscription`, {
    headers: { 'X-User-Id': userId },
  });

  if (!response.ok) {
    throw new Error('Failed to get subscription');
  }

  return response.json();
}

// Get user purchases
export async function getUserPurchases(userId: string) {
  const response = await fetch(`${API_BASE}/purchases`, {
    headers: { 'X-User-Id': userId },
  });

  if (!response.ok) {
    throw new Error('Failed to get purchases');
  }

  return response.json();
}

// Get user downloads
export async function getUserDownloads(userId: string) {
  const response = await fetch(`${API_BASE}/downloads`, {
    headers: { 'X-User-Id': userId },
  });

  if (!response.ok) {
    throw new Error('Failed to get downloads');
  }

  return response.json();
}

// Update user profile
export async function updateUserProfile(
  userId: string,
  data: {
    name?: string;
    avatarUrl?: string;
  }
) {
  const response = await fetch(`${API_BASE}/profile`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'X-User-Id': userId,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to update profile');
  }

  return response.json();
}

// Get play history
export async function getPlayHistory(userId: string) {
  const response = await fetch(`${API_BASE}/history`, {
    headers: { 'X-User-Id': userId },
  });

  if (!response.ok) {
    return [];
  }

  return response.json();
}

// Cancel subscription
export async function cancelSubscription(userId: string) {
  const response = await fetch(`${API_BASE}/subscription/cancel`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-User-Id': userId,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to cancel subscription');
  }

  return response.json();
}
