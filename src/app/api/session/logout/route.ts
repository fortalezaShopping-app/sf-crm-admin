import { NextResponse } from 'next/server';

import {
  ADMIN_TOKEN_COOKIE,
  BACKOFFICE_ROLE_COOKIE,
  BACKOFFICE_STORE_COOKIE,
} from '@/lib/admin-session';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ADMIN_TOKEN_COOKIE);
  response.cookies.delete(BACKOFFICE_ROLE_COOKIE);
  response.cookies.delete(BACKOFFICE_STORE_COOKIE);
  return response;
}
