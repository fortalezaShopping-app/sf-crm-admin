import 'server-only';

import type { AdminSession } from '@/lib/admin-session';
import {
  getTokenExpiresAt,
  isTokenExpired,
} from '@/lib/admin-session';
import type { LoginEmailRequest, LoginResponse } from '@/lib/api';
import { getApiBaseUrl } from '@/lib/env';

const REQUEST_TIMEOUT_MS = 12_000;

type AuthenticatedProfile = {
  email?: string;
  id?: number;
  name?: string;
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

export async function authenticateAdmin(credentials: LoginEmailRequest) {
  const login = await backendRequest<LoginResponse>('/api/auth/admin/login', {
    body: credentials,
    method: 'POST',
  });

  if (!login.token) {
    throw new BackendApiError('A API respondeu sem token.', 502, login);
  }

  const session = await resolveAdminSession(login.token, login, credentials.email);
  return { session, token: login.token };
}

export async function resolveAdminSession(
  token: string,
  login: LoginResponse = {},
  fallbackEmail?: string,
): Promise<AdminSession> {
  if (isTokenExpired(token)) {
    throw new BackendApiError('A sessao expirou. Inicie sessao novamente.', 401, null);
  }

  const profile = await backendRequest<AuthenticatedProfile>('/api/auth/profile', { token });

  return {
    email: profile.email ?? login.email ?? fallbackEmail,
    expiresAt: getTokenExpiresAt(token),
    id: profile.id ?? login.id,
    nome: profile.name ?? login.name,
    role: 'ADMIN',
  };
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
