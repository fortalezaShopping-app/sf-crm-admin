import { NextResponse } from 'next/server';

import { ADMIN_TOKEN_COOKIE } from '@/lib/admin-session';
import type { LoginEmailRequest } from '@/lib/api';
import { authenticateAdmin, BackendApiError } from '@/lib/server-backend';

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

    const { session, token } = await authenticateAdmin({
      email: credentials.email.trim(),
      password: credentials.password,
    });
    const response = isFormSubmission
      ? new NextResponse(null, {
          headers: { Location: '/dashboard' },
          status: 303,
        })
      : NextResponse.json({ session });
    const maxAge = session.expiresAt
      ? Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000))
      : 8 * 60 * 60;

    response.cookies.set(ADMIN_TOKEN_COOKIE, token, {
      httpOnly: true,
      maxAge,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

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
