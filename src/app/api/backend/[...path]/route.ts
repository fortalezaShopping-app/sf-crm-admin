import { NextResponse } from 'next/server';

import { ADMIN_TOKEN_COOKIE, BACKOFFICE_ROLE_COOKIE, BACKOFFICE_STORE_COOKIE } from '@/lib/admin-session';
import { getApiBaseUrl } from '@/lib/env';
import { resolveAdminSession } from '@/lib/server-backend';
import { getAdminToken, getAuthenticatedBackofficeSession } from '@/lib/server-auth';
import { canProxyRequest, getProxyTargetUrl, isSameOriginRequest, MAX_PROXY_BODY_BYTES, readRequestBody, RequestInputError } from '@/lib/request-security';

type ProxyContext = {
  params: Promise<{
    path: string[];
  }>;
};

const FORWARDED_HEADERS = ['accept', 'content-type'];

export async function GET(request: Request, context: ProxyContext) {
  return proxyRequest(request, context);
}

export async function POST(request: Request, context: ProxyContext) {
  return proxyRequest(request, context);
}

export async function PUT(request: Request, context: ProxyContext) {
  return proxyRequest(request, context);
}

export async function PATCH(request: Request, context: ProxyContext) {
  return proxyRequest(request, context);
}

export async function DELETE(request: Request, context: ProxyContext) {
  return proxyRequest(request, context);
}

async function proxyRequest(request: Request, context: ProxyContext) {
  const token = await getAdminToken();

  if (!token) {
    return NextResponse.json({ message: 'Sessao expirada.' }, { status: 401 });
  }

  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: 'Origem do pedido invalida.' }, { status: 403 });
  }

  try {
    const { path } = await context.params;
    const targetUrl = getProxyTargetUrl(path, request.url, getApiBaseUrl());
    const session = await getAuthenticatedBackofficeSession();
    if (!session) {
      return NextResponse.json({ message: 'Sessao expirada.' }, { status: 401 });
    }

    const method = request.method.toUpperCase();
    if (!canProxyRequest(session, targetUrl.pathname, method)) {
      return NextResponse.json(
        { message: 'A sua conta nao tem permissao para aceder a este recurso.' },
        { status: 403 },
      );
    }
    const body = method === 'GET' || method === 'HEAD'
      ? undefined
      : await readRequestBody(request, MAX_PROXY_BODY_BYTES);

    const response = await fetch(targetUrl, {
      body,
      cache: 'no-store',
      headers: getForwardedHeaders(request.headers, token),
      method,
      redirect: 'error',
      signal: AbortSignal.timeout(12_000),
    });

    const sessionIsValid = response.status === 401
      ? await canResolveAdminSession(token)
      : true;

    if (response.status === 401 && sessionIsValid) {
      return NextResponse.json(
        { message: 'A sua conta nao tem permissao para aceder a este recurso.' },
        { status: 403 },
      );
    }

    const proxyResponse = new NextResponse(response.body, {
      headers: getResponseHeaders(response.headers),
      status: response.status,
      statusText: response.statusText,
    });

    if (response.status === 401 && !sessionIsValid) {
      proxyResponse.cookies.delete(ADMIN_TOKEN_COOKIE);
      proxyResponse.cookies.delete(BACKOFFICE_ROLE_COOKIE);
      proxyResponse.cookies.delete(BACKOFFICE_STORE_COOKIE);
    }

    return proxyResponse;
  } catch (error) {
    if (error instanceof RequestInputError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return Response.json(
      { message: 'Falha ao contactar a API.' },
      { status: 502 },
    );
  }
}

async function canResolveAdminSession(token: string) {
  try {
    await resolveAdminSession(token);
    return true;
  } catch {
    return false;
  }
}

function getForwardedHeaders(sourceHeaders: Headers, token: string) {
  const headers = new Headers();

  FORWARDED_HEADERS.forEach((name) => {
    const value = sourceHeaders.get(name);

    if (value) {
      headers.set(name, value);
    }
  });

  headers.set('Authorization', `Bearer ${token}`);

  return headers;
}

function getResponseHeaders(sourceHeaders: Headers) {
  const headers = new Headers();
  headers.set('Cache-Control', 'private, no-store');
  const contentType = sourceHeaders.get('content-type');

  if (contentType) {
    headers.set('content-type', contentType);
  }

  return headers;
}
