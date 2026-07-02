import { getApiBaseUrl } from '@/lib/env';

export type LoginEmailRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token?: string;
  tipo?: string;
  nome?: string;
  role?: string | null;
  id?: number;
  lojaId?: number | null;
  email?: string;
};

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  token?: string | null;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function adminLogin(payload: LoginEmailRequest) {
  return apiRequest<LoginResponse>('/api/v1/auth/admin/login', {
    body: payload,
    method: 'POST',
  });
}

export async function apiRequest<T>(
  path: string,
  { body, headers, token, ...options }: ApiRequestOptions = {},
): Promise<T> {
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'application/json');

  const requestBody = buildRequestBody(body, requestHeaders);

  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(toApiUrl(path), {
    ...options,
    body: requestBody,
    headers: requestHeaders,
  });
  const data = await readResponseBody(response);

  if (!response.ok) {
    throw new ApiError(getErrorMessage(data, response.status), response.status, data);
  }

  return data as T;
}

function buildRequestBody(body: unknown, headers: Headers) {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    return body;
  }

  headers.set('Content-Type', 'application/json');
  return JSON.stringify(body);
}

function toApiUrl(path: string) {
  if (path.startsWith('http')) {
    return path;
  }

  return `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

async function readResponseBody(response: Response) {
  const text = await response.text();

  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(data: unknown, status: number) {
  if (isErrorShape(data)) {
    return data.message;
  }

  return `A API respondeu com status ${status}.`;
}

function isErrorShape(data: unknown): data is { message: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'message' in data &&
    typeof data.message === 'string'
  );
}
