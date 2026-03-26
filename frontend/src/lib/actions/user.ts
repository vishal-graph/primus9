'use server';

/**
 * User Server Actions
 * Handles profile retrieval, updates, and onboarding
 */

import { getServerAuthHeaders } from '@/lib/server-auth';
import { getApiBase } from '@/lib/api-base';

export interface UserProfile {
  id: string;
  clerkId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  phone?: string;
  bio?: string;
  location?: string;
  website?: string;
  company?: string;
  occupation?: string;
  onboarded: boolean;
}

export async function getUserProfile(): Promise<{ success: boolean; data?: UserProfile; error?: string }> {
  try {
    const authHeaders = await getServerAuthHeaders();

    if (!authHeaders) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/user/profile`, {
      headers: {
        'Authorization': authHeaders!.Authorization,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      let errorMessage = `Failed to fetch profile: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      return { 
        success: false, 
        error: errorMessage
      };
    }

    const responseData = await response.json();
    return { success: true, data: responseData.data };
  } catch (error) {
    console.error('Error fetching profile:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function updateUserProfile(profileData: Partial<UserProfile>): Promise<{ success: boolean; data?: UserProfile; error?: string }> {
  try {
    const authHeaders = await getServerAuthHeaders();

    if (!authHeaders) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/user/profile`, {
      method: 'PATCH',
      headers: {
        'Authorization': authHeaders!.Authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { 
        success: false, 
        error: errorData.error || 'Failed to update profile' 
      };
    }

    const { data } = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { success: false, error: (error as Error).message };
  }
}

export interface OnboardingData {
  phone: string;
  name: string;
  location?: string;
}

export async function completeOnboarding(data: OnboardingData): Promise<{ success: boolean; data?: UserProfile; error?: string }> {
  try {
    const authHeaders = await getServerAuthHeaders();

    if (!authHeaders) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/user/onboarding`, {
      method: 'POST',
      headers: {
        'Authorization': authHeaders!.Authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to complete onboarding';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = `Failed to complete onboarding: ${response.status}`;
      }
      return { 
        success: false, 
        error: errorMessage
      };
    }

    const responseData = await response.json();
    return { success: true, data: responseData.data };
  } catch (error) {
    console.error('Error in onboarding:', error);
    return { success: false, error: (error as Error).message };
  }
}

