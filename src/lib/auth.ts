import type { LoginResponse } from '@/lib/api';

const ADMIN_SESSION_STORAGE_KEY = 'sf-admin-session';
const ADMIN_SESSION_EVENT = 'sf-admin-session-change';

let cachedRawSession: string | null | undefined;
let cachedSession: AdminSession | null = null;

export type AdminSession = LoginResponse & {
  token: string;
};

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
  window.dispatchEvent(new Event(ADMIN_SESSION_EVENT));
}

function parseAdminSession(rawSession: string | null) {
  if (!rawSession) {
    return null;
  }

  try {
    const parsedSession: unknown = JSON.parse(rawSession);
    return isAdminSession(parsedSession) ? parsedSession : null;
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
    value.token.length > 0
  );
}
