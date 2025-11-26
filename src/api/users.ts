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
  const response = await fetch(`${API_BASE}/subscription?userId=${userId}`);

  if (!response.ok) {
    throw new Error('Failed to get subscription');
  }

  return response.json();
}

// Get user purchases
export async function getUserPurchases(userId: string) {
  const response = await fetch(`${API_BASE}/purchases?userId=${userId}`);

  if (!response.ok) {
    throw new Error('Failed to get purchases');
  }

  return response.json();
}

// Get user downloads
export async function getUserDownloads(userId: string) {
  const response = await fetch(`${API_BASE}/downloads?userId=${userId}`);

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
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...data }),
  });

  if (!response.ok) {
    throw new Error('Failed to update profile');
  }

  return response.json();
}
