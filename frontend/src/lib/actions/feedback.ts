'use server';

import { getServerAuthHeaders } from '@/lib/server-auth';
import { getApiBase } from '@/lib/api-base';

export interface SubmitFeedbackInput {
  projectId: string;
  rooms: string[];
  ratings: Record<string, number | string>;
  aiEvaluation: Record<string, any>;
  improvementSignals: Array<{ id: string; priority: number; explanation?: string }>;
  businessIntent: Record<string, any>;
  openSignal?: string;
  metadata: {
    stagesUsed: string[];
    regenerationCount: number;
    timeSpent?: number;
    errorsOrRetries: number;
    selectedStyles?: string[];
    planType?: string;
  };
}

export async function checkFeedbackExists(
  projectId: string
): Promise<{ success: boolean; exists?: boolean; error?: string }> {
  try {
    const authHeaders = await getServerAuthHeaders();

    if (!authHeaders) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/feedback/${projectId}`, {
      headers: {
        'Authorization': authHeaders!.Authorization,
      },
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to check feedback' };
    }

    const result = await response.json();
    return { success: true, exists: result.data?.exists || false };
  } catch (error) {
    console.error('Check feedback error:', error);
    return { success: false, error: 'Network error' };
  }
}

export async function submitFeedback(
  input: SubmitFeedbackInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const authHeaders = await getServerAuthHeaders();

    if (!authHeaders) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeaders!.Authorization,
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to submit feedback';
      try {
        const errorData = await response.json();
        // Handle different error response formats
        if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.error?.code) {
          errorMessage = errorData.error.code;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // If response is not JSON, use status text
        errorMessage = response.statusText || 'Failed to submit feedback';
      }
      return { success: false, error: errorMessage };
    }

    return { success: true };
  } catch (error) {
    console.error('Submit feedback error:', error);
    return { success: false, error: 'Network error' };
  }
}

