import 'server-only';

import { cookies } from 'next/headers';

import {
  ADMIN_TOKEN_COOKIE,
  BACKOFFICE_ROLE_COOKIE,
  BACKOFFICE_STORE_COOKIE,
  isTokenExpired,
  normalizeAuthRole,
} from '@/lib/admin-session';
import { resolveAdminSession } from '@/lib/server-backend';
import { readStoreBinding } from '@/lib/server-store-binding';

export async function getAdminToken() {
  const token = (await cookies()).get(ADMIN_TOKEN_COOKIE)?.value;

  if (!token || isTokenExpired(token)) {
    return null;
  }

  return token;
}

export async function getAuthenticatedAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_TOKEN_COOKIE)?.value;

  if (!token || isTokenExpired(token)) {
    return null;
  }

  try {
    const role = normalizeAuthRole(cookieStore.get(BACKOFFICE_ROLE_COOKIE)?.value);
    const storeId = await readStoreBinding(
      cookieStore.get(BACKOFFICE_STORE_COOKIE)?.value,
      token,
    );

    return await resolveAdminSession(
      token,
      {
        role: role ?? undefined,
        storeId,
      },
      undefined,
      role,
    );
  } catch {
    return null;
  }
}

export const getAuthenticatedBackofficeSession = getAuthenticatedAdminSession;
