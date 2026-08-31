import { NextResponse } from 'next/server';

import {
  ADMIN_TOKEN_COOKIE,
  BACKOFFICE_ROLE_COOKIE,
  BACKOFFICE_STORE_COOKIE,
  getSessionDestination,
} from '@/lib/admin-session';
import type { LoginEmailRequest } from '@/lib/api';
import { authenticateBackoffice, BackendApiError } from '@/lib/server-backend';
import { createStoreBinding } from '@/lib/server-store-binding';

export async function POST(request: Request) {
  const isFormSubmission = request.headers
    .get('content-type')
    ?.includes('application/x-www-form-urlencoded') ?? false;

  try {
    const credentials = await readCredentials(request, isFormSubmission);

    if (!credentials.email?.trim() || !credentials.password) {
      return NextResponse.json(
        { message: 'Preencha o email e a senha.' },
        { status: 400 },
      );
    }

    const { session, token } = await authenticateBackoffice({
      email: credentials.email.trim(),
      password: credentials.password,
    });
    const redirectTo = getSessionDestination(session);
    const response = isFormSubmission
      ? new NextResponse(null, {
          headers: { Location: redirectTo },
          status: 303,
        })
      : NextResponse.json({ redirectTo, session });
    const maxAge = session.expiresAt
      ? Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000))
      : 8 * 60 * 60;

    const cookieOptions = {
      httpOnly: true,
      maxAge,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    } as const;

    response.cookies.set(ADMIN_TOKEN_COOKIE, token, cookieOptions);
    response.cookies.set(BACKOFFICE_ROLE_COOKIE, session.role, cookieOptions);

    if (session.storeId) {
      response.cookies.set(
        BACKOFFICE_STORE_COOKIE,
        await createStoreBinding(session.storeId, token),
        cookieOptions,
      );
    } else {
      response.cookies.delete(BACKOFFICE_STORE_COOKIE);
    }

    return response;
  } catch (error) {
    if (error instanceof BackendApiError) {
      if (isFormSubmission) {
        return new NextResponse(null, {
          headers: { Location: '/login?error=invalid-credentials' },
          status: 303,
        });
      }

      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { message: 'Nao foi possivel iniciar sessao.' },
      { status: 500 },
    );
  }
}

async function readCredentials(request: Request, isFormSubmission: boolean) {
  if (!isFormSubmission) {
    return (await request.json()) as LoginEmailRequest;
  }

  const formData = await request.formData();

  return {
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  } satisfies LoginEmailRequest;
}
