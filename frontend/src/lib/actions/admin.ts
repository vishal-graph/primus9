/**
 * Admin Server Actions
 * 
 * Server-side actions for admin dashboard
 * All actions require @tatvaops.com authentication
 */

'use server';

import { auth } from '@clerk/nextjs/server';
import { getApiBase } from '../api-base';

// ============================================
// TYPES
// ============================================

export interface AnomalyFlag {
  type: 'REGEN_ABUSE' | 'PROJECT_HOARDING' | 'BURST_ACTIVITY' | 'PLAN_ABUSE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  details: string;
  value: number;
  threshold: number;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers7d: number;
  totalProjects: number;
  totalGenerations: number;
  totalRegenerations: number;
  avgProjectsPerUser: number;
  trends: {
    users24h: number;
    projects7d: number;
  };
}

export interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  plan: string;
  totalProjects: number;
  totalGenerations: number;
  totalRegenerations: number;
  accountCreatedAt: Date;
  lastActiveAt: Date;
  anomalyFlags: AnomalyFlag[];
}

export interface AdminUserProfile {
  basicInfo: {
    id: string;
    email: string;
    name: string | null;
    signupDate: Date;
    plan: string;
    status: string;
  };
  planUsage: {
    projectsUsed: number;
    projectsAllowed: number;
    regenCount: number;
    regenLimit: number;
  };
  projects: Array<{
    id: string;
    name: string;
    createdAt: Date;
    roomCount: number;
    theme: string;
    totalGenerations: number;
    totalRegenerations: number;
    exportCount: number;
  }>;
  feedbackSummary: {
    count: number;
    avgSatisfaction: number;
    commonSignals: string[];
    lastFeedbackAt: Date | null;
  };
  aiUsage: {
    moodboardGens: number;
    elevationGens: number;
    interiorGens: number;
    floorplanAnalysis: number;
  };
}

export interface AdminFeedback {
  id: string;
  userId: string;
  userEmail: string;
  projectId: string;
  projectName: string;
  overallScore: number;
  aiUnderstandingScore: number;
  improvementVectors: string[];
  businessIntent: object;
  createdAt: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get auth headers for API requests
 */
async function getAuthHeaders() {
  const { getToken } = auth();
  const token = await getToken();

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Handle API response
 */
async function handleApiResponse<T>(response: Response): Promise<{ success: boolean; data?: T; error?: string }> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    return {
      success: false,
      error: errorData.error?.message || errorData.error || `HTTP ${response.status}`,
    };
  }

  const result = await response.json();
  return {
    success: true,
    data: result.data,
  };
}

// ============================================
// ADMIN ACTIONS
// ============================================

/**
 * Get dashboard overview statistics
 */
export async function getAdminStats(): Promise<{ success: boolean; data?: AdminStats; error?: string }> {
  try {
    const apiBase = getApiBase();
    const headers = await getAuthHeaders();

    const response = await fetch(`${apiBase}/api/admin/stats`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    return await handleApiResponse<AdminStats>(response);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch admin stats',
    };
  }
}

/**
 * Get users list with pagination and filtering
 */
export async function getAdminUsers(params: {
  page?: number;
  limit?: number;
  search?: string;
  filter?: 'all' | 'anomaly' | 'high_regen' | 'feedback_submitted';
  plan?: string;
}): Promise<{ success: boolean; data?: PaginatedResponse<AdminUser>; error?: string }> {
  try {
    const apiBase = getApiBase();
    const headers = await getAuthHeaders();

    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.search) queryParams.set('search', params.search);
    if (params.filter) queryParams.set('filter', params.filter);
    if (params.plan) queryParams.set('plan', params.plan);

    const response = await fetch(`${apiBase}/api/admin/users?${queryParams.toString()}`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    const result = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: result.error?.message || result.error || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch admin users',
    };
  }
}

/**
 * Get user 360° profile
 */
export async function getAdminUserProfile(userId: string): Promise<{ success: boolean; data?: AdminUserProfile; error?: string }> {
  try {
    const apiBase = getApiBase();
    const headers = await getAuthHeaders();

    const response = await fetch(`${apiBase}/api/admin/users/${userId}`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    return await handleApiResponse<AdminUserProfile>(response);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user profile',
    };
  }
}

/**
 * Get feedback submissions list
 */
export async function getAdminFeedback(params: {
  page?: number;
  limit?: number;
  sort?: 'createdAt' | 'overallScore';
  order?: 'asc' | 'desc';
  search?: string;
}): Promise<{ success: boolean; data?: PaginatedResponse<AdminFeedback>; error?: string }> {
  try {
    const apiBase = getApiBase();
    const headers = await getAuthHeaders();

    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.sort) queryParams.set('sort', params.sort);
    if (params.order) queryParams.set('order', params.order);
    if (params.search) queryParams.set('search', params.search);

    const response = await fetch(`${apiBase}/api/admin/feedback?${queryParams.toString()}`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    const result = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: result.error?.message || result.error || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error('Error fetching admin feedback:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch admin feedback',
    };
  }
}

