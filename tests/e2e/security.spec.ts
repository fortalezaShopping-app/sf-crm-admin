import { createHmac } from 'node:crypto';
import { expect, test as base, type APIRequestContext, type BrowserContext } from '@playwright/test';

const origin = 'http://localhost:3103';
const test = base.extend<{ backend: APIRequestContext }>({
  backend: async ({ playwright }, runFixture) => {
    const api = await playwright.request.newContext({ baseURL: 'https://127.0.0.1:4443', ignoreHTTPSErrors: true });
    await runFixture(api);
    await api.dispose();
  },
});

function tokenFor(role?: string) {
  return `local.${Buffer.from(JSON.stringify({ sub: '999', role, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`;
}

async function setToken(context: BrowserContext, token = tokenFor('ADMIN')) {
  await context.addCookies([{ name: 'sf-admin-token', value: token, domain: 'localhost', path: '/' }]);
}

test.beforeEach(async ({ backend, context }) => {
  await backend.get('/__reset');
  await setToken(context);
});

test('security headers protect the panel without disabling the QR camera', async ({ context }) => {
  const response = await context.request.get('/dashboard/utilizadores');
  expect(response.status()).toBe(200);
  const headers = response.headers();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['permissions-policy']).toContain('camera=(self)');
  expect(headers['x-powered-by']).toBeUndefined();
  const image = await context.request.get('/_next/image?url=%2Ffavicon.ico&w=32&q=75');
  expect(image.status()).toBe(404);
});

test('login and logout reject cross-origin and missing-origin mutations', async ({ context, backend }) => {
  const origins: Record<string, string>[] = [{}, { origin: 'https://evil.example.test' }, { origin: 'null' }];
  for (const path of ['/api/session/login', '/api/session/logout']) {
    for (const headers of origins) {
      const response = await context.request.post(path, { headers, data: { email: 'admin@example.test', password: 'test-password' } });
      expect(response.status()).toBe(403);
    }
  }
  expect((await backend.get('/__requests')).ok()).toBe(true);
  const calls = await (await backend.get('/__requests')).json();
  expect(calls).toEqual([]);
  expect((await context.cookies()).some((cookie) => cookie.name === 'sf-admin-token')).toBe(true);
});

test('login rejects malformed or oversized input without contacting the API', async ({ context, backend }) => {
  for (const data of ['{invalid', 'null', '[]', '{"email":12,"password":false}']) {
    const response = await context.request.post('/api/session/login', { headers: { origin, 'content-type': 'application/json' }, data });
    expect(response.status()).toBe(400);
  }
  const large = await context.request.post('/api/session/login', { headers: { origin }, data: { email: 'admin@example.test', password: 'x'.repeat(20_000) } });
  expect(large.status()).toBe(413);
  expect(await (await backend.get('/__requests')).json()).toEqual([]);
});

test('administrator login keeps tokens HttpOnly and returns no bearer token to the browser', async ({ context }) => {
  await context.clearCookies();
  const response = await context.request.post('/api/session/login', { headers: { origin }, data: { email: 'admin@example.test', password: 'test-password' } });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.redirectTo).toBe('/dashboard');
  expect(body.session.role).toBe('ADMIN');
  expect(body.token).toBeUndefined();
  const cookies = await context.cookies();
  const token = cookies.find((cookie) => cookie.name === 'sf-admin-token');
  expect(token?.httpOnly).toBe(true);
  expect(token?.sameSite).toBe('Lax');
  expect(cookies.some((cookie) => ['sf-backoffice-role', 'sf-backoffice-store'].includes(cookie.name))).toBe(false);
  expect((await context.request.post('/api/session/logout', { headers: { origin } })).status()).toBe(200);
  expect((await context.cookies()).some((cookie) => cookie.name === 'sf-admin-token')).toBe(false);
});

test('HTML login forms continue to work without JavaScript', async ({ context }) => {
  await context.clearCookies();
  const response = await context.request.post('/api/session/login', { headers: { origin }, form: { email: 'admin@example.test', password: 'test-password' }, maxRedirects: 0 });
  expect(response.status()).toBe(303);
  expect(response.headers().location).toBe('/dashboard');
});

test('a merchant login uses the backend role and registered store', async ({ context, backend }) => {
  await backend.get('/__merchant');
  await context.clearCookies();
  const response = await context.request.post('/api/session/login', { headers: { origin }, data: { email: 'admin@example.test', password: 'test-password' } });
  expect(response.status()).toBe(200);
  expect((await response.json()).session).toMatchObject({ role: 'STORE_USER', storeId: 1 });
  expect((await context.request.get('/lojista')).status()).toBe(200);
});

test('role cookies cannot grant privileges to accounts without a backend role', async ({ context, backend }) => {
  await backend.post('/__profile', { data: { id: 100, email: 'unknown@example.test' } });
  await setToken(context, tokenFor());
  await context.addCookies([{ name: 'sf-backoffice-role', value: 'ADMIN', domain: 'localhost', path: '/' }]);
  expect((await context.request.get('/api/backend/api/admin/users')).status()).toBe(401);
  expect((await context.request.get('/api/admin/dashboard/resumo')).status()).toBe(401);
  const page = await context.request.get('/dashboard', { maxRedirects: 0 });
  expect(page.headers().location).toBe('/login');
  const calls = await (await backend.get('/__requests')).json();
  expect(calls.every((call: { path: string }) => call.path === '/api/auth/profile')).toBe(true);
});

test('legacy store cookies signed with the known token cannot assign another store', async ({ context, backend }) => {
  await backend.post('/__profile', { data: { id: 8, email: 'afriteste@teste.com', roles: ['STORE_USER'] } });
  const token = tokenFor('STORE_USER');
  await setToken(context, token);
  const forged = `99.${createHmac('sha256', token).update('99').digest('base64url')}`;
  await context.addCookies([{ name: 'sf-backoffice-store', value: forged, domain: 'localhost', path: '/' }]);
  const response = await context.request.post('/api/merchant/purchases/scan', { headers: { origin }, data: { qrContent: 'qr-local' } });
  expect(response.status()).toBe(401);
  const calls = await (await backend.get('/__requests')).json();
  expect(calls.some((call: { path: string }) => call.path === '/api/store/purchases/scan')).toBe(false);
});

test('customer profiles and rejected tokens cannot access administrator data', async ({ context, backend }) => {
  await backend.post('/__profile', { data: { id: 100, email: 'customer@example.test', roles: ['CUSTOMER'] } });
  expect((await context.request.get('/api/backend/api/admin/users')).status()).toBe(401);
  await backend.get('/__reset');
  await setToken(context, 'invalid-token');
  expect((await context.request.get('/api/backend/api/admin/users')).status()).toBe(401);
});

test('merchant isolation applies to API requests, not just page navigation', async ({ context, backend }) => {
  await backend.get('/__merchant');
  await context.addCookies([{ name: 'sf-backoffice-role', value: 'ADMIN', domain: 'localhost', path: '/' }]);
  for (const path of ['/api/backend/api/admin/users', '/api/admin/dashboard/resumo', '/api/backend/api/public/stores/2']) {
    expect((await context.request.get(path)).status()).toBe(403);
  }
  const bypass = await context.request.post('/api/backend/api/store/purchases/scan', { headers: { origin }, data: { storeId: 2, qrContent: 'qr-local' } });
  expect(bypass.status()).toBe(403);
  const scan = await context.request.post('/api/merchant/purchases/scan', { headers: { origin }, data: { storeId: 2, qrContent: 'qr-local' } });
  expect(scan.status()).toBe(200);
  expect((await scan.json()).storeId).toBe(1);
  const calls = await (await backend.get('/__requests')).json();
  expect(calls.find((call: { path: string }) => call.path === '/api/store/purchases/scan').body.storeId).toBe(1);
  const confirm = await context.request.post('/api/merchant/purchases/test-purchase/confirm', { headers: { origin }, data: { amount: 12000 } });
  expect(confirm.status()).toBe(200);
});

test('protected purchase routes reject malformed input before registering purchases', async ({ context, backend }) => {
  await backend.get('/__merchant');
  for (const amount of [true, [], '12000', -1, 0, null]) {
    expect((await context.request.post('/api/merchant/purchases/test-purchase/confirm', { headers: { origin }, data: { amount } })).status()).toBe(400);
  }
  expect((await context.request.post('/api/merchant/purchases/scan', { headers: { origin }, data: [] })).status()).toBe(400);
  expect((await context.request.post('/api/merchant/purchases/scan', { headers: { origin }, data: { qrContent: ' ' } })).status()).toBe(400);
  expect((await context.request.post('/api/merchant/purchases/scan', { headers: { origin: 'https://evil.example.test' }, data: { qrContent: 'qr-local' } })).status()).toBe(403);
  const calls = await (await backend.get('/__requests')).json();
  expect(calls.every((call: { path: string }) => call.path === '/api/auth/profile')).toBe(true);
});

test('API responses are not cached and uploaded documents cannot execute scripts', async ({ context }) => {
  const image = await context.request.get('/api/backend/api/admin/invoices/1/image');
  expect(image.status()).toBe(200);
  expect(image.headers()['cache-control']).toContain('no-store');
  expect(image.headers()['content-security-policy']).toContain('sandbox');
  expect(image.headers()['content-security-policy']).toContain("default-src 'none'");
  const dashboard = await context.request.get('/api/admin/dashboard/resumo');
  expect(dashboard.status()).toBe(200);
  expect((await dashboard.json()).usersTotal).toBe(12);
  expect(dashboard.headers()['cache-control']).toContain('no-store');
});

test('proxy mutations reject foreign origins without touching backend data', async ({ context, backend }) => {
  const response = await context.request.put('/api/backend/api/auth/profile', { headers: { origin: 'https://evil.example.test' }, data: { name: 'Changed' } });
  expect(response.status()).toBe(403);
  expect(await (await backend.get('/__requests')).json()).toEqual([]);
});

test('scripts in uploaded SVG files remain blocked when opened directly', async ({ page }) => {
  await page.goto('/api/backend/api/admin/stores/1/image');
  await expect(page.locator('svg')).toBeVisible();
  await expect(page.locator('svg')).not.toHaveAttribute('data-script-executed');
});

test('explicit server mappings keep legacy merchants working while backend store data wins', async ({ context, backend }) => {
  await backend.post('/__profile', { data: { id: 1234, email: 'mapped@example.test', roles: ['STORE_USER'] } });
  await setToken(context, tokenFor('STORE_USER'));
  const scan = await context.request.post('/api/merchant/purchases/scan', { headers: { origin }, data: { qrContent: 'qr-local' } });
  expect(scan.status()).toBe(200);
  expect((await scan.json()).storeId).toBe(7);

  await backend.post('/__profile', { data: { id: 1234, email: 'mapped@example.test', roles: ['STORE_USER'], storeId: 1 } });
  const assigned = await context.request.post('/api/merchant/purchases/scan', { headers: { origin }, data: { qrContent: 'qr-local' } });
  expect(assigned.status()).toBe(200);
  expect((await assigned.json()).storeId).toBe(1);
});
