import 'server-only';

import { cookies } from 'next/headers';
import { cache } from 'react';

import {
  ADMIN_TOKEN_COOKIE,
  isTokenExpired,
} from '@/lib/admin-session';
import { BackendApiError, resolveAdminSession } from '@/lib/server-backend';

export async function getAdminToken() {
  const token = (await cookies()).get(ADMIN_TOKEN_COOKIE)?.value;

  if (!token || isTokenExpired(token)) {
    return null;
  }

  return token;
}

export const getAuthenticatedAdminSession = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_TOKEN_COOKIE)?.value;

  if (!token || isTokenExpired(token)) {
    return null;
  }

  // Cookies supplied by the browser are never a source of permissions or store ownership.
  return validateBackofficeToken(token);
});

export const getAuthenticatedBackofficeSession = getAuthenticatedAdminSession;

export async function validateBackofficeToken(token: string) {
  try {
    return await resolveAdminSession(token);
  } catch (error) {
    if (error instanceof BackendApiError && [401, 403].includes(error.status)) {
      return null;
    }
    // A timeout, rate limit or server failure is not evidence of an invalid session.
    throw new BackendApiError(
      'Nao foi possivel confirmar a sessao. Tente novamente dentro de instantes.',
      503,
      null,
    );
  }
}
