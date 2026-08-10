import 'server-only';

import { cookies } from 'next/headers';

import { ADMIN_TOKEN_COOKIE, isTokenExpired } from '@/lib/admin-session';
import { resolveAdminSession } from '@/lib/server-backend';

export async function getAdminToken() {
  const token = (await cookies()).get(ADMIN_TOKEN_COOKIE)?.value;

  if (!token || isTokenExpired(token)) {
    return null;
  }

  return token;
}

export async function getAuthenticatedAdminSession() {
  const token = await getAdminToken();

  if (!token) {
    return null;
  }

  try {
    return await resolveAdminSession(token);
  } catch {
    return null;
  }
}
