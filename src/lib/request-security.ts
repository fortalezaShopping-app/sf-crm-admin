import type { AdminSession } from './admin-session';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
export const MAX_PROXY_BODY_BYTES = 25 * 1024 * 1024;

export class RequestInputError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'RequestInputError';
    this.status = status;
  }
}

export function isSameOriginRequest(request: Request) {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

  const site = request.headers.get('sec-fetch-site');
  if (site === 'cross-site' || site === 'same-site') return false;

  const origin = request.headers.get('origin');
  const expectedOrigin = new URL(request.url).origin;
  if (origin !== null) return origin === expectedOrigin;

  const referer = request.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).origin === expectedOrigin;
    } catch {
      return false;
    }
  }

  return site === 'same-origin';
}

export function getProxyTargetUrl(path: string[], requestUrl: string, apiBaseUrl: string) {
  // Reject encoded separators and traversal before the backend can normalize them differently.
  if (path[0] !== 'api' || path.length < 2 || path.some((part) => !/^[a-zA-Z0-9_-]+$/.test(part))) {
    throw new RequestInputError('Caminho da API invalido.');
  }

  const target = new URL(`/${path.join('/')}`, apiBaseUrl);
  target.search = new URL(requestUrl).search;
  return target;
}

export function canProxyRequest(session: AdminSession, pathname: string, method: string) {
  if (pathname === '/api/store/purchases' || pathname.startsWith('/api/store/purchases/')) {
    return false;
  }

  if (session.role === 'ADMIN' || session.role === 'MANAGER') return true;
  if (session.role !== 'STORE_USER' || !session.storeId) return false;

  if (pathname === '/api/auth/profile') return ['GET', 'PUT'].includes(method);
  if (pathname === '/api/notifications') return method === 'GET';
  if (/^\/api\/notifications\/\d+\/read$/.test(pathname)) return method === 'PATCH';

  const storePath = `/api/public/stores/${session.storeId}`;
  return method === 'GET' && [storePath, `${storePath}/logo`, `${storePath}/image`].includes(pathname);
}

export async function readRequestBody(request: Request, limit = 16 * 1024): Promise<ArrayBuffer> {
  const length = request.headers.get('content-length');
  if (length && Number(length) > limit) {
    await request.body?.cancel();
    throw new RequestInputError('O ficheiro ou pedido excede o tamanho permitido.', 413);
  }

  const reader = request.body?.getReader();
  if (!reader) return new ArrayBuffer(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new RequestInputError('O ficheiro ou pedido excede o tamanho permitido.', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body.buffer;
}

export async function readJsonObject(request: Request) {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    throw new RequestInputError('O pedido deve usar application/json.', 415);
  }
  const body = await readRequestBody(request);
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(body));
  } catch {
    throw new RequestInputError('O pedido contem JSON invalido.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestInputError('O pedido deve conter um objeto JSON.');
  }
  return value as Record<string, unknown>;
}
