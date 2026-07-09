import type { LoginResponse } from '@/lib/api';

const ADMIN_SESSION_STORAGE_KEY = 'sf-admin-session';
const ADMIN_SESSION_EVENT = 'sf-admin-session-change';
const BACKOFFICE_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'GESTOR', 'LOJISTA']);

let cachedRawSession: string | null | undefined;
let cachedSession: AdminSession | null = null;

export type AdminSession = LoginResponse & {
  expiresAt?: number | null;
  savedAt?: string;
  token: string;
};

export function createAdminSession(login: LoginResponse, currentUser: LoginResponse) {
  if (!login.token) {
    throw new Error('A API respondeu sem token.');
  }

  const tokenRole = getTokenRole(login.token);
  const session: AdminSession = {
    ...login,
    ...currentUser,
    expiresAt: getTokenExpiresAt(login.token),
    role: currentUser.role ?? login.role ?? tokenRole,
    savedAt: new Date().toISOString(),
    tipo: currentUser.tipo ?? login.tipo ?? tokenRole,
    token: login.token,
  };

  assertBackofficeSession(session);
  return session;
}

export function saveAdminSession(session: AdminSession) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(ADMIN_SESSION_EVENT));
}

export function getAdminSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawSession = window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
  return parseAdminSession(rawSession);
}

export function getAdminSessionSnapshot() {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawSession = window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);

  if (rawSession === cachedRawSession) {
    return cachedSession;
  }

  cachedRawSession = rawSession;
  cachedSession = parseAdminSession(rawSession);
  return cachedSession;
}

export function subscribeAdminSession(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener('storage', onStoreChange);
  window.addEventListener(ADMIN_SESSION_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(ADMIN_SESSION_EVENT, onStoreChange);
  };
}

export function clearAdminSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  cachedRawSession = null;
  cachedSession = null;
  window.dispatchEvent(new Event(ADMIN_SESSION_EVENT));
}

export function assertBackofficeSession(session: AdminSession | LoginResponse) {
  const role = getSessionRole(session);

  if (!role) {
    throw new Error(
      'Esta conta nao tem role ADMIN, GESTOR ou LOJISTA associada na API.',
    );
  }

  if (!BACKOFFICE_ROLES.has(role)) {
    throw new Error('Esta conta pertence ao app mobile. Use uma conta administrativa.');
  }

  if ('token' in session && typeof session.token === 'string' && isTokenExpired(session.token)) {
    throw new Error('A sessao expirou. Inicie sessao novamente.');
  }
}

export function getSessionRole(session: LoginResponse) {
  const explicitRole = normalizeRole(session.role ?? session.tipo);

  if (explicitRole) {
    return explicitRole;
  }

  return session.token ? getTokenRole(session.token) : '';
}

export function isBackofficeSession(session: LoginResponse) {
  const role = getSessionRole(session);
  return BACKOFFICE_ROLES.has(role);
}

function parseAdminSession(rawSession: string | null) {
  if (!rawSession) {
    return null;
  }

  try {
    const parsedSession: unknown = JSON.parse(rawSession);
    return isAdminSession(parsedSession) && isBackofficeSession(parsedSession)
      ? parsedSession
      : null;
  } catch {
    return null;
  }
}

function isAdminSession(value: unknown): value is AdminSession {
  return (
    typeof value === 'object' &&
    value !== null &&
    'token' in value &&
    typeof value.token === 'string' &&
    value.token.length > 0 &&
    !isTokenExpired(value.token)
  );
}

function isTokenExpired(token: string) {
  const expiresAt = getTokenExpiresAt(token);

  if (!expiresAt) {
    return false;
  }

  return Date.now() >= expiresAt;
}

function getTokenExpiresAt(token: string) {
  const data = getTokenPayload(token);

  if (
    typeof data === 'object' &&
    data !== null &&
    'exp' in data &&
    typeof data.exp === 'number'
  ) {
    return data.exp * 1000;
  }

  return null;
}

function getTokenRole(token: string) {
  const payload = getTokenPayload(token);
  const candidates = getRoleCandidates(payload);

  return candidates.find((role) => BACKOFFICE_ROLES.has(role)) ?? candidates[0] ?? '';
}

function getTokenPayload(token: string) {
  const [, payload] = token.split('.');

  if (!payload || typeof atob === 'undefined') {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(payload)) as unknown;
  } catch {
    return null;
  }
}

function getRoleCandidates(payload: unknown) {
  if (!isRecord(payload)) {
    return [];
  }

  return [
    ...extractRoleValues(payload.role),
    ...extractRoleValues(payload.roles),
    ...extractRoleValues(payload.tipo),
    ...extractRoleValues(payload.authority),
    ...extractRoleValues(payload.authorities),
    ...extractRoleValues(payload.scope),
    ...extractRoleValues(payload.scopes),
    ...extractNestedRoleValues(payload.realm_access),
    ...extractNestedRoleValues(payload.resource_access),
  ]
    .map(normalizeRole)
    .filter(Boolean);
}

function extractNestedRoleValues(value: unknown) {
  if (!isRecord(value)) {
    return [];
  }

  return Object.values(value).flatMap((item) => {
    if (isRecord(item) && 'roles' in item) {
      return extractRoleValues(item.roles);
    }

    return extractRoleValues(item);
  });
}

function extractRoleValues(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (typeof value === 'string') {
    return value.split(/[\s,]+/).filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.flatMap(extractRoleValues);
  }

  if (isRecord(value)) {
    return [
      ...extractRoleValues(value.authority),
      ...extractRoleValues(value.name),
      ...extractRoleValues(value.nome),
      ...extractRoleValues(value.role),
    ];
  }

  return [];
}

function normalizeRole(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toUpperCase().replace(/^ROLE_/, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const binary = atob(padded);

  return decodeURIComponent(
    Array.from(binary, (char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''),
  );
}
