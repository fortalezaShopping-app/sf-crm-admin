import { NextResponse } from 'next/server';

import { ADMIN_TOKEN_COOKIE } from '@/lib/admin-session';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ADMIN_TOKEN_COOKIE);
  return response;
}
