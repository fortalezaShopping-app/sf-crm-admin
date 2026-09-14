import 'server-only';

import { cookies } from 'next/headers';
import { cache } from 'react';

import {
  ADMIN_TOKEN_COOKIE,
  isTokenExpired,
} from '@/lib/admin-session';
import { resolveAdminSession } from '@/lib/server-backend';

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

  try {
    // Cookies supplied by the browser are never a source of permissions or store ownership.
    return await resolveAdminSession(token);
  } catch {
    return null;
  }
});

export const getAuthenticatedBackofficeSession = getAuthenticatedAdminSession;
