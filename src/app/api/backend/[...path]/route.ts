import { getApiBaseUrl } from '@/lib/env';

type ProxyContext = {
  params: Promise<{
    path: string[];
  }>;
};

const FORWARDED_HEADERS = ['accept', 'authorization', 'content-type'];

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
  const targetUrl = await getTargetUrl(request, context);
  const method = request.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer();

  try {
    const response = await fetch(targetUrl, {
      body,
      cache: 'no-store',
      headers: getForwardedHeaders(request.headers),
      method,
    });

    return new Response(response.body, {
      headers: getResponseHeaders(response.headers),
      status: response.status,
      statusText: response.statusText,
    });
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

async function getTargetUrl(request: Request, context: ProxyContext) {
  const { path } = await context.params;
  const sourceUrl = new URL(request.url);
  const targetPath = path.map((part) => encodeURIComponent(part)).join('/');
  const targetUrl = new URL(`/${targetPath}`, getApiBaseUrl());

  targetUrl.search = sourceUrl.search;
  return targetUrl;
}

function getForwardedHeaders(sourceHeaders: Headers) {
  const headers = new Headers();

  FORWARDED_HEADERS.forEach((name) => {
    const value = sourceHeaders.get(name);

    if (value) {
      headers.set(name, value);
    }
  });

  return headers;
}

function getResponseHeaders(sourceHeaders: Headers) {
  const headers = new Headers();
  const contentType = sourceHeaders.get('content-type');

  if (contentType) {
    headers.set('content-type', contentType);
  }

  return headers;
}
