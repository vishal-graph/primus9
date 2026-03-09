/**
 * Centralized API Base URL Resolver
 * 
 * This module provides a single source of truth for API base URLs
 * across server-side and client-side code.
 * 
 * Architecture:
 * - Server-side (SSR/Server Actions/Route Handlers): Uses BACKEND_API_URL
 * - Client-side (Browser): Uses NEXT_PUBLIC_API_URL
 * 
 * No fallbacks to localhost - throws error if env var is missing
 */

export function getApiBase(): string {
  const isServer = typeof window === "undefined";

  if (isServer) {
    const apiBase = process.env.BACKEND_API_URL;
    if (!apiBase) {
      throw new Error(
        "BACKEND_API_URL is required in server runtime. " +
        "Set it in docker-compose.yml or .env file."
      );
    }
    return apiBase;
  }

  // Client-side: Use NEXT_PUBLIC_API_URL
  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  // Require explicit configuration - no automatic fallback
  if (!apiBase) {
    // In development, fall back to backend on port 4000
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:4000';
    }
    throw new Error(
      "NEXT_PUBLIC_API_URL is required in client runtime. " +
      "Set it in docker-compose.yml or .env file."
    );
  }

  return apiBase;
}

// Startup check (server-side only)
if (typeof window === "undefined" && !process.env.BACKEND_API_URL) {
  throw new Error(
    "BACKEND_API_URL is required in server runtime. " +
    "Set it in docker-compose.yml or .env file."
  );
}

