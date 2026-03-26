import { getServerAuthHeaders } from '@/lib/server-auth';
import type { ApiResponse } from '@/types';
import { getApiBase } from '@/lib/api-base';

/**
 * API Client
 * Abstracted HTTP client for backend communication
 *
 * Features:
 * - Automatic auth header injection (via cookie JWT)
 * - Request/response typing
 * - Error handling
 * - Retry logic with exponential backoff
 */

interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string>;
  retry?: number;
  body?: unknown;
}

/**
 * Server-side API client (uses Clerk auth)
 * Use this in Server Actions and Server Components
 */
export async function serverFetch<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { params, retry = 3, body, ...fetchOptions } = options;

  // Get API base URL (uses BACKEND_API_URL for server-side)
  const API_BASE_URL = getApiBase();

  // Build URL with query params
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });
  }

  // Get auth token from cookie
  const authHeaders = await getServerAuthHeaders();
  const token = authHeaders?.Authorization?.replace('Bearer ', '') ?? null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retry; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        ...fetchOptions,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.error?.code || 'UNKNOWN_ERROR',
            message: data.error?.message || 'An error occurred',
            details: data.error?.details,
          },
        };
      }

      return {
        success: true,
        data: data.data,
        meta: data.meta,
      };
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on last attempt
      if (attempt < retry - 1) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  }

  return {
    success: false,
    error: {
      code: 'NETWORK_ERROR',
      message: lastError?.message || 'Network error',
    },
  };
}

/**
 * Client-side API fetch (needs token passed explicitly)
 * Use this in Client Components with useAuth()
 */
export function createClientFetch(token: string | null) {
  return async function clientFetch<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { params, retry = 3, body, ...fetchOptions } = options;

    // Get API base URL (uses NEXT_PUBLIC_API_URL for client-side)
    const API_BASE_URL = getApiBase();

    // Build URL with query params
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value);
        }
      });
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retry; attempt++) {
      try {
        const response = await fetch(url.toString(), {
          ...fetchOptions,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });

        const data = await response.json();

        if (!response.ok) {
          return {
            success: false,
            error: {
              code: data.error?.code || 'UNKNOWN_ERROR',
              message: data.error?.message || 'An error occurred',
              details: data.error?.details,
            },
          };
        }

        return {
          success: true,
          data: data.data,
          meta: data.meta,
        };
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < retry - 1) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
        }
      }
    }

    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: lastError?.message || 'Network error',
      },
    };
  };
}

/**
 * Legacy API client (for backwards compatibility)
 * @deprecated Use serverFetch or createClientFetch instead
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  get<T>(endpoint: string, options?: { params?: Record<string, string> }) {
    return serverFetch<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown, options?: { params?: Record<string, string> }) {
    return serverFetch<T>(endpoint, { ...options, method: 'POST', body });
  }

  put<T>(endpoint: string, body?: unknown, options?: { params?: Record<string, string> }) {
    return serverFetch<T>(endpoint, { ...options, method: 'PUT', body });
  }

  patch<T>(endpoint: string, body?: unknown, options?: { params?: Record<string, string> }) {
    return serverFetch<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  delete<T>(endpoint: string, options?: { params?: Record<string, string> }) {
    return serverFetch<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(getApiBase());
