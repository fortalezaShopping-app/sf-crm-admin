import 'server-only';

import type { AdminSession } from '@/lib/admin-session';
import {
  getTokenRole,
  getTokenStoreId,
  getTokenExpiresAt,
  isBackofficeRole,
  isTokenExpired,
  normalizeAuthRole,
} from '@/lib/admin-session';
import type { AuthRole } from '@/lib/admin-session';
import type { LoginEmailRequest, LoginResponse } from '@/lib/api';
import { getApiBaseUrl } from '@/lib/env';
import { getTemporaryMerchantStoreId } from '@/lib/server-merchant-store-map';

const REQUEST_TIMEOUT_MS = 12_000;

type AuthenticatedProfile = {
  email?: string;
  id?: number;
  name?: string;
  role?: string;
  roles?: string[];
  storeId?: number;
};

type BackendRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  token?: string;
};

export class BackendApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data: unknown,
  ) {
    super(message);
    this.name = 'BackendApiError';
  }
}

export async function authenticateBackoffice(credentials: LoginEmailRequest) {
  let loginPath = '/api/auth/admin/login';
  let login: LoginResponse;

  try {
    login = await requestLogin(loginPath, credentials);
  } catch (error) {
    if (!(error instanceof BackendApiError) || ![401, 403].includes(error.status)) {
      throw error;
    }

    loginPath = '/api/auth/login';
    login = await requestLogin(loginPath, credentials);
  }

  const token = getLoginToken(login);

  if (!token) {
    throw new BackendApiError('A API respondeu sem token.', 502, login);
  }

  const temporaryStoreId = loginPath.endsWith('/admin/login')
    ? undefined
    : getTemporaryMerchantStoreId({
        email: login.email ?? credentials.email,
        id: login.id,
      });
  const explicitRole = normalizeAuthRole(login.role) ?? getTokenRole(token);
  const role = explicitRole ??
    (temporaryStoreId
      ? 'STORE_USER'
      : loginPath.endsWith('/admin/login')
        ? 'ADMIN'
        : 'CUSTOMER');

  if (!isBackofficeRole(role)) {
    throw new BackendApiError(
      'Esta area e reservada a administradores e lojistas.',
      403,
      login,
    );
  }

  const session = await resolveAdminSession(
    token,
    {
      ...login,
      storeId: login.storeId ?? temporaryStoreId,
    },
    credentials.email,
    role,
  );
  return { session, token };
}

export const authenticateAdmin = authenticateBackoffice;

export async function resolveAdminSession(
  token: string,
  login: LoginResponse = {},
  fallbackEmail?: string,
  roleHint?: AuthRole | null,
): Promise<AdminSession> {
  if (isTokenExpired(token)) {
    throw new BackendApiError('A sessao expirou. Inicie sessao novamente.', 401, null);
  }

  const profile = await backendRequest<AuthenticatedProfile>('/api/auth/profile', { token });
  const role = getProfileRole(profile) ??
    normalizeAuthRole(login.role) ??
    getTokenRole(token) ??
    roleHint ??
    'ADMIN';

  if (!isBackofficeRole(role)) {
    throw new BackendApiError('A conta nao tem acesso ao painel de gestao.', 403, profile);
  }

  const email = profile.email ?? login.email ?? fallbackEmail;
  const id = profile.id ?? login.id;
  const storeId = toPositiveInteger(profile.storeId) ??
    getTokenStoreId(token) ??
    (role === 'STORE_USER' ? getTemporaryMerchantStoreId({ email, id }) : undefined) ??
    toPositiveInteger(login.storeId);

  if (role === 'STORE_USER' && !storeId) {
    throw new BackendApiError(
      'A conta de lojista nao tem uma loja associada. Contacte o administrador.',
      403,
      profile,
    );
  }

  return {
    email,
    expiresAt: getTokenExpiresAt(token),
    id,
    nome: profile.name ?? login.name,
    role,
    storeId,
  };
}

function requestLogin(path: string, credentials: LoginEmailRequest) {
  return backendRequest<LoginResponse>(path, {
    body: credentials,
    method: 'POST',
  });
}

function getLoginToken(login: LoginResponse) {
  return login.token ?? login.accessToken ?? login.access_token ?? login.jwt;
}

function getProfileRole(profile: AuthenticatedProfile) {
  const candidates = [profile.role, ...(profile.roles ?? [])];

  for (const candidate of candidates) {
    const role = normalizeAuthRole(candidate);

    if (role) {
      return role;
    }
  }

  return null;
}

function toPositiveInteger(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

export async function backendRequest<T>(
  path: string,
  { body, headers, token, ...options }: BackendRequestOptions = {},
): Promise<T> {
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'application/hal+json, application/json');

  let requestBody: BodyInit | undefined;

  if (body !== undefined && body !== null) {
    requestHeaders.set('Content-Type', 'application/json');
    requestBody = JSON.stringify(body);
  }

  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(toBackendUrl(path), {
      ...options,
      body: requestBody,
      cache: 'no-store',
      headers: requestHeaders,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new BackendApiError(
      error instanceof Error ? `Falha ao contactar a API: ${error.message}` : 'Falha ao contactar a API.',
      502,
      null,
    );
  }

  const data = await readResponseBody(response);

  if (!response.ok) {
    throw new BackendApiError(getErrorMessage(data, response.status), response.status, data);
  }

  return data as T;
}

function toBackendUrl(path: string) {
  return `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

async function readResponseBody(response: Response) {
  const text = await response.text();

  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function getErrorMessage(data: unknown, status: number) {
  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>;
    const message = record.message ?? record.erro ?? record.error;

    if (typeof message === 'string') {
      return message;
    }
  }

  return `A API respondeu com status ${status}.`;
}
