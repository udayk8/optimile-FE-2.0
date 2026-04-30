import { clearStoredAuthSession, getStoredAuthSession, persistAuthSession } from './authStorage';

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
}

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
  retryOnAuthFailure?: boolean;
  signal?: AbortSignal;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
let inFlightRefresh: Promise<boolean> | null = null;

function toFetchBody(body: unknown): BodyInit | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }
  if (typeof body === 'string' || body instanceof FormData || body instanceof URLSearchParams || body instanceof Blob) {
    return body;
  }
  return JSON.stringify(body);
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    return text || null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isApiErrorPayload(payload: unknown): payload is { message?: string; error?: string } {
  return typeof payload === 'object' && payload !== null;
}

async function refreshAccessToken(): Promise<boolean> {
  const authSession = getStoredAuthSession();
  if (!authSession?.tokens.refreshToken) {
    clearStoredAuthSession();
    return false;
  }

  if (inFlightRefresh) {
    return inFlightRefresh;
  }

  inFlightRefresh = (async () => {
    try {
      const refreshPaths = ['/api/v1/auth/refresh', '/auth/refresh'] as const;
      let response: Response | null = null;

      for (const path of refreshPaths) {
        response = await fetch(`${API_BASE_URL}${path}`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: authSession.tokens.refreshToken }),
        });

        if (response.ok) {
          break;
        }

        const shouldTryLegacyPath = path === '/api/v1/auth/refresh'
          && (response.status === 404 || response.status === 405);
        if (!shouldTryLegacyPath) {
          break;
        }
      }

      if (!response || !response.ok) {
        clearStoredAuthSession();
        return false;
      }

      const payload = (await parseResponsePayload(response)) as RefreshResponse | null;
      if (!payload?.accessToken || !payload?.refreshToken) {
        clearStoredAuthSession();
        return false;
      }

      persistAuthSession(
        {
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
          tokenType: payload.tokenType || 'Bearer',
          expiresAt: Date.now() + Math.max(0, payload.expiresInSeconds) * 1000,
        },
        authSession.rememberMe
      );
      return true;
    } catch {
      clearStoredAuthSession();
      return false;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
}

async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    auth = true,
    retryOnAuthFailure = true,
    signal,
  } = options;

  const finalHeaders: Record<string, string> = {
    'Accept': 'application/json',
    ...headers,
  };

  if (!(body instanceof FormData) && !finalHeaders['Content-Type']) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  // 8-O2: Unique request ID for end-to-end tracing (correlate frontend → backend logs)
  finalHeaders['X-Request-ID'] = crypto.randomUUID();

  if (auth) {
    let session = getStoredAuthSession();

    // 1-A2: Proactive expiry check — refresh before the request if token expires in < 30s
    if (session?.tokens.expiresAt && session.tokens.expiresAt - Date.now() < 30_000) {
      await refreshAccessToken();
      session = getStoredAuthSession();
    }

    if (session?.tokens.accessToken) {
      finalHeaders.Authorization = `Bearer ${session.tokens.accessToken}`;
    }

    // 1-A1: X-Tenant-ID for multi-tenant isolation
    if (session?.tenantId) {
      finalHeaders['X-Tenant-ID'] = session.tenantId;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: toFetchBody(body),
    signal,
  });

  if (response.status === 401 && auth && retryOnAuthFailure) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, { ...options, retryOnAuthFailure: false });
    }
  }

  if (!response.ok) {
    const payload = await parseResponsePayload(response);
    let message = `Request failed (${response.status})`;
    if (isApiErrorPayload(payload)) {
      message = payload.message || payload.error || message;
    }
    throw new ApiError(response.status, message, payload);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await parseResponsePayload(response)) as T;
}

/**
 * 8-O3: Non-blocking backend readiness check.
 * Returns true if the backend /api/v1/health endpoint responds with 2xx.
 * Never throws — always resolves to true or false.
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const apiClient = {
  get<T>(path: string, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) {
    return request<T>(path, { ...options, method: 'GET' });
  },
  post<T>(path: string, body?: unknown, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) {
    return request<T>(path, { ...options, method: 'POST', body });
  },
  put<T>(path: string, body?: unknown, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) {
    return request<T>(path, { ...options, method: 'PUT', body });
  },
  patch<T>(path: string, body?: unknown, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) {
    return request<T>(path, { ...options, method: 'PATCH', body });
  },
  delete<T>(path: string, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) {
    return request<T>(path, { ...options, method: 'DELETE' });
  },
};
