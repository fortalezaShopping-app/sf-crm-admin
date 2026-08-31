import 'server-only';

import { NextResponse } from 'next/server';

import type { AdminSession } from '@/lib/admin-session';
import { BackendApiError } from '@/lib/server-backend';
import {
  getAdminToken,
  getAuthenticatedBackofficeSession,
} from '@/lib/server-auth';

type MerchantContext = {
  session: AdminSession & { role: 'STORE_USER'; storeId: number };
  token: string;
};

export class MerchantAccessError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'MerchantAccessError';
  }
}

export async function getMerchantContext(): Promise<MerchantContext> {
  const [session, token] = await Promise.all([
    getAuthenticatedBackofficeSession(),
    getAdminToken(),
  ]);

  if (!session || !token) {
    throw new MerchantAccessError('Sessao expirada.', 401);
  }

  if (session.role !== 'STORE_USER') {
    throw new MerchantAccessError('Apenas lojistas podem registar compras.', 403);
  }

  if (!session.storeId) {
    throw new MerchantAccessError(
      'A conta de lojista nao tem uma loja associada.',
      403,
    );
  }

  return {
    session: {
      ...session,
      role: 'STORE_USER',
      storeId: session.storeId,
    },
    token,
  };
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

export function merchantErrorResponse(error: unknown) {
  if (error instanceof MerchantAccessError || error instanceof BackendApiError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  return NextResponse.json(
    { message: 'Nao foi possivel processar a compra.' },
    { status: 500 },
  );
}
