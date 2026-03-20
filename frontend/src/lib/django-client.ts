/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from '@/auth';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://127.0.0.1:8000/api';

/**
 * Helper to fetch data from the Django API server-side logic (e.g., inside Next.js Server Actions)
 * Automatically injects the JWT access token from the active session.
 */
export async function djangoFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const session = await auth();
  const token = (session as any)?.accessToken;

  if (!token) {
    console.warn(`[djangoFetch] No accessToken found in session for endpoint: ${endpoint}`);
  }

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${DJANGO_API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Django API Error: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      // Prefix with status code for easier detection by callers
      errorMsg = `${response.status}: ${JSON.stringify(errorData)}`;
    } catch {
      // Not JSON, use default
      errorMsg = `${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMsg);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null as unknown as T;
  }

  return response.json();
}
