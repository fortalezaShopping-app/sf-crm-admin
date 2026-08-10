import { NextResponse } from 'next/server';

import { ADMIN_TOKEN_COOKIE } from '@/lib/admin-session';
import { getApiBaseUrl } from '@/lib/env';
import { resolveAdminSession } from '@/lib/server-backend';
import { getAdminToken } from '@/lib/server-auth';

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

  const targetUrl = await getTargetUrl(request, context);
  const method = request.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer();

  try {
    const response = await fetch(targetUrl, {
      body,
      cache: 'no-store',
      headers: getForwardedHeaders(request.headers, token),
      method,
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
    }

    return proxyResponse;
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error
            ? `Falha ao contactar a API: ${error.message}`
            : 'Falha ao contactar a API.',
      },
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

async function getTargetUrl(request: Request, context: ProxyContext) {
  const { path } = await context.params;
  const sourceUrl = new URL(request.url);
  const targetPath = path.map((part) => encodeURIComponent(part)).join('/');
  const targetUrl = new URL(`/${targetPath}`, getApiBaseUrl());

  targetUrl.search = sourceUrl.search;
  return targetUrl;
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

function isSameOriginRequest(request: Request) {
  const method = request.method.toUpperCase();

  if (method === 'GET' || method === 'HEAD') {
    return true;
  }

  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

function getResponseHeaders(sourceHeaders: Headers) {
  const headers = new Headers();
  const contentType = sourceHeaders.get('content-type');

  if (contentType) {
    headers.set('content-type', contentType);
  }

  return headers;
}
