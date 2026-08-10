export const ADMIN_TOKEN_COOKIE = 'sf-admin-token';

export type AdminSession = {
  email?: string;
  expiresAt: number | null;
  id?: number;
  nome?: string;
  role: string;
};

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

function getTokenPayload(token: string): Record<string, unknown> | null {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
