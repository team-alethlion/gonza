/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from '@/auth';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://127.0.0.1:8000/api';

/**
 * Helper to fetch data from the Django API server-side logic (e.g., inside Next.js Server Actions)
 * Automatically injects the JWT access token from the active session.
 */
export async function djangoFetch<T = any>(endpoint: string, options: RequestInit & { accessToken?: string } = {}): Promise<T> {
  // If accessToken is provided in options, use it. 
  // ONLY call auth() if no token was provided.
  const session = (await auth() as any);
  const token = options.accessToken || session?.accessToken;
  const isTokenDead = session?.authError === "RefreshAccessTokenError";

  // List of endpoints that are allowed to be accessed without a token (Public-Friendly)
  const isPublicFriendly = endpoint.includes('core/packages/') || 
                           endpoint.includes('core/agencies/') ||
                           endpoint.includes('auth/token') || 
                           endpoint.includes('public/');

  if (!token && !isPublicFriendly) {
    console.warn(`[djangoFetch] No accessToken found in session for protected endpoint: ${endpoint}`);
  }

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // 🛡️ TOKEN POISONING PREVENTION:
  // If the token is known to be dead, do NOT attach it to public-friendly requests.
  // This allows the subscription page to load even if the session is orphaned.
  if (token && (!isTokenDead || !isPublicFriendly)) {
    headers.set('Authorization', `Bearer ${token}`);
  } else if (isTokenDead && isPublicFriendly) {
    console.log(`[djangoFetch] Token dead. Accessing ${endpoint} anonymously.`);
  }

  const url = `${DJANGO_API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  // 🛡️ RETRY LOGIC: Try up to 2 times for transient connection errors
  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorMsg = `Django API Error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          // 🚀 ENHANCED ERROR PARSING: Extract the most specific message possible
          if (errorData.detail) {
            errorMsg = `${response.status}: ${errorData.detail}`;
          } else if (errorData.messages && Array.isArray(errorData.messages) && errorData.messages[0]?.message) {
            errorMsg = `${response.status}: ${errorData.messages[0].message}`;
          } else {
            errorMsg = `${response.status}: ${JSON.stringify(errorData)}`;
          }
        } catch {
          errorMsg = `${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      if (response.status === 204) return null as unknown as T;
      return await response.json();

    } catch (error: any) {
      attempts++;
      const isConnectionError = 
        error.message?.includes('fetch failed') || 
        error.cause?.code === 'UND_ERR_SOCKET' || 
        error.cause?.code === 'ECONNREFUSED';

      if (isConnectionError && attempts < maxAttempts) {
        console.warn(`[djangoFetch] Connection failed. Retrying... (${attempts}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 200 * attempts)); // Backoff
        continue;
      }
      throw error;
    }
  }

  return null as unknown as T; // Should not reach here
}
