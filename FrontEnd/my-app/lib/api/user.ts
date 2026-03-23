/**
 * User / Profile API – via the centralised Axios client.
 *
 * Endpoints (all under /api/v1/users):
 *  GET    /search              – search users
 *  GET    /leaderboard         – leaderboard
 *  GET    /:address            – user by Stellar address
 *  GET    /:address/stats      – user statistics
 *  GET    /:address/quests     – user quest history (paginated)
 *  PATCH  /profile             – update own profile (auth required)
 *  DELETE /:address            – delete own account (auth required)
 *
 * Dashboard helpers still available (fetchDashboardData etc.)
 */

import { get, patch, del, withRetry, createCancelToken, type CancelToken } from './client';
import type {
  UserResponse,
  UserStatsResponse,
  UpdateProfileRequest,
  UserSearchParams,
  PaginationParams,
} from '@/lib/types/api.types';

// Re-export legacy dashboard types for backward compat
export type {
  UserStats,
  Quest,
  Submission,
  EarningsData,
  Badge,
  DashboardData,
} from '../types/dashboard';

// ---------------------------------------------------------------------------
// Fetch user by Stellar address
// ---------------------------------------------------------------------------

export async function fetchUserByAddress(
  address: string,
  cancelToken?: CancelToken,
): Promise<UserResponse> {
  return withRetry(() =>
    get<UserResponse>(`/users/${address}`, {
      signal: cancelToken?.signal,
    }),
  );
}

// ---------------------------------------------------------------------------
// User stats
// ---------------------------------------------------------------------------

export async function fetchUserStats(
  address: string,
  cancelToken?: CancelToken,
): Promise<UserStatsResponse> {
  return withRetry(() =>
    get<UserStatsResponse>(`/users/${address}/stats`, {
      signal: cancelToken?.signal,
    }),
  );
}

// ---------------------------------------------------------------------------
// User quest history
// ---------------------------------------------------------------------------

export async function fetchUserQuests(
  address: string,
  page = 1,
  limit = 20,
  cancelToken?: CancelToken,
): Promise<{ quests: unknown[]; total: number; page: number; limit: number }> {
  return withRetry(() =>
    get<{ quests: unknown[]; total: number; page: number; limit: number }>(
      `/users/${address}/quests`,
      {
        params: { page, limit },
        signal: cancelToken?.signal,
      },
    ),
  );
}

// ---------------------------------------------------------------------------
// Update own profile (authenticated)
// ---------------------------------------------------------------------------

export async function updateProfile(
  payload: UpdateProfileRequest,
): Promise<UserResponse> {
  return patch<UserResponse>('/users/profile', payload);
}

// ---------------------------------------------------------------------------
// Search users
// ---------------------------------------------------------------------------

export async function searchUsers(
  params: UserSearchParams,
  cancelToken?: CancelToken,
): Promise<{ users: UserResponse[]; total: number }> {
  return withRetry(() =>
    get<{ users: UserResponse[]; total: number }>('/users/search', {
      params: params as Record<string, unknown>,
      signal: cancelToken?.signal,
    }),
  );
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

export async function fetchLeaderboard(
  page = 1,
  limit = 50,
  cancelToken?: CancelToken,
): Promise<{ users: UserResponse[]; total: number }> {
  return withRetry(() =>
    get<{ users: UserResponse[]; total: number }>('/users/leaderboard', {
      params: { page, limit },
      signal: cancelToken?.signal,
    }),
  );
}

// ---------------------------------------------------------------------------
// Delete own account
// ---------------------------------------------------------------------------

export async function deleteAccount(address: string): Promise<void> {
  return del<void>(`/users/${address}`);
}

// ---------------------------------------------------------------------------
// Dashboard aggregate (convenience)
// ---------------------------------------------------------------------------

/**
 * Fetch all dashboard data in parallel for the given Stellar address.
 */
export async function fetchDashboardData(address: string) {
  const [userProfile, userStats] = await Promise.all([
    fetchUserByAddress(address),
    fetchUserStats(address),
  ]);
  return { userProfile, userStats };
}

// ---------------------------------------------------------------------------
// Profile page (legacy shape – profile + achievements + activities)
// ---------------------------------------------------------------------------

export async function fetchUserProfile(address: string) {
  return fetchUserByAddress(address);
}

export async function updateUserProfile(
  _address: string,
  data: UpdateProfileRequest,
) {
  return updateProfile(data);
}
