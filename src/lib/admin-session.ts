export const ADMIN_TOKEN_COOKIE = 'sf-admin-token';
export const BACKOFFICE_ROLE_COOKIE = 'sf-backoffice-role';
export const BACKOFFICE_STORE_COOKIE = 'sf-backoffice-store';

export type AuthRole = 'ADMIN' | 'CUSTOMER' | 'MANAGER' | 'STORE_USER';
export type BackofficeRole = Exclude<AuthRole, 'CUSTOMER'>;

export type AdminSession = {
  email?: string;
  expiresAt: number | null;
  id?: number;
  nome?: string;
  role: BackofficeRole;
  storeId?: number;
};

export function getSessionDestination(session: Pick<AdminSession, 'role'>) {
  return session.role === 'STORE_USER' ? '/lojista' : '/dashboard';
}

export function getTokenExpiresAt(token: string) {
  const payload = getTokenPayload(token);

  if (typeof payload?.exp === 'number') {
    return payload.exp * 1000;
  }

  return null;
}

export function isTokenExpired(token: string) {
  const expiresAt = getTokenExpiresAt(token);
  return expiresAt !== null && Date.now() >= expiresAt;
}

export function getTokenRole(token: string): AuthRole | null {
  const payload = getTokenPayload(token);

  if (!payload) {
    return null;
  }

  const candidates = [
    payload.role,
    payload.userRole,
    payload.user_role,
    payload.roles,
    payload.authorities,
    payload.scope,
  ];

  for (const candidate of candidates) {
    const values = Array.isArray(candidate)
      ? candidate
      : typeof candidate === 'string'
        ? candidate.split(/[ ,]+/)
        : [];

    for (const value of values) {
      const role = normalizeAuthRole(value);

      if (role) {
        return role;
      }
    }
  }

  return null;
}

export function getTokenStoreId(token: string): number | undefined {
  const payload = getTokenPayload(token);

  if (!payload) {
    return undefined;
  }

  const store = isRecord(payload.store) ? payload.store : null;
  const candidates = [
    payload.storeId,
    payload.store_id,
    payload.shopId,
    payload.shop_id,
    store?.id,
  ];

  for (const candidate of candidates) {
    const storeId = toPositiveInteger(candidate);

    if (storeId !== undefined) {
      return storeId;
    }
  }

  return undefined;
}

export function normalizeAuthRole(value: unknown): AuthRole | null {
  if (typeof value !== 'string') {
    return null;
  }

  const role = value.trim().toUpperCase().replace(/^ROLE_/, '');

  return role === 'ADMIN' ||
    role === 'CUSTOMER' ||
    role === 'MANAGER' ||
    role === 'STORE_USER'
    ? role
    : null;
}

export function isBackofficeRole(role: AuthRole | null): role is BackofficeRole {
  return role === 'ADMIN' || role === 'MANAGER' || role === 'STORE_USER';
}

export function getTokenPayload(token: string): Record<string, unknown> | null {
  const [, encodedPayload] = token.split('.');

  if (!encodedPayload || typeof atob === 'undefined') {
    return null;
  }

  try {
    const normalized = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    );
    const binary = atob(padded);
    const json = decodeURIComponent(
      Array.from(
        binary,
        (character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`,
      ).join(''),
    );
    const parsed: unknown = JSON.parse(json);

    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function toPositiveInteger(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value);

  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
