export interface AuthTokenBundle {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: number;
}

interface StoredAuthSession {
  tokens: AuthTokenBundle;
  tenantId?: string;
}

const AUTH_STORAGE_KEY = 'optimile_erp_auth_session';

function parseStoredSession(rawValue: string | null): StoredAuthSession | null {
  if (!rawValue) {
    return null;
  }
  try {
    const parsed = JSON.parse(rawValue) as StoredAuthSession;
    if (!parsed?.tokens?.accessToken || !parsed?.tokens?.refreshToken) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getStoredAuthSession(): { tokens: AuthTokenBundle; rememberMe: boolean; tenantId?: string } | null {
  const localSession = parseStoredSession(localStorage.getItem(AUTH_STORAGE_KEY));
  if (localSession) {
    return { tokens: localSession.tokens, rememberMe: true, tenantId: localSession.tenantId };
  }

  const sessionSession = parseStoredSession(sessionStorage.getItem(AUTH_STORAGE_KEY));
  if (sessionSession) {
    return { tokens: sessionSession.tokens, rememberMe: false, tenantId: sessionSession.tenantId };
  }

  return null;
}

export function persistAuthSession(tokens: AuthTokenBundle, rememberMe: boolean, tenantId?: string): void {
  clearStoredAuthSession();
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ tokens, tenantId }));
}

export function clearStoredAuthSession(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}
