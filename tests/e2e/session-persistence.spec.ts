import { expect, test as base, type APIRequestContext } from '@playwright/test';

const origin = 'http://localhost:3103';
const test = base.extend<{ backend: APIRequestContext }>({
  backend: async ({ playwright }, runFixture) => {
    const api = await playwright.request.newContext({
      baseURL: 'https://127.0.0.1:4443',
      ignoreHTTPSErrors: true,
    });
    await runFixture(api);
    await api.dispose();
  },
});

test.beforeEach(async ({ backend, context }) => {
  await backend.get('/__reset');
  const token = `local.${Buffer.from(JSON.stringify({ sub: '999', role: 'ADMIN', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`;
  await context.addCookies([{ name: 'sf-admin-token', value: token, domain: 'localhost', path: '/' }]);
});

test('session persists after login when profile and JWT omit roles', async ({ context, backend }) => {
  await backend.post('/__session-behavior', {
    data: { hideProfileRole: true, hideTokenRole: true },
  });
  await context.clearCookies();
  const login = await context.request.post('/api/session/login', {
    headers: { origin },
    data: { email: 'admin@example.test', password: 'test-password' },
  });
  expect(login.status()).toBe(200);
  for (let i = 0; i < 3; i++) {
    const users = await context.request.get('/api/backend/api/admin/users');
    expect(users.status()).toBe(200);
    const page = await context.request.get('/dashboard/utilizadores', { maxRedirects: 0 });
    expect(page.status()).toBe(200);
  }
});

test('temporary profile failures are not reported as expired sessions', async ({ context, backend }) => {
  await backend.post('/__session-behavior', { data: { profileStatus: 503 } });
  const before = (await context.cookies()).find((cookie) => cookie.name === 'sf-admin-token');
  for (const path of ['/api/backend/api/admin/users', '/api/admin/dashboard/resumo']) {
    const response = await context.request.get(path);
    expect(response.status()).toBe(503);
    expect(response.headers()['set-cookie']).toBeUndefined();
  }
  expect((await context.cookies()).find((cookie) => cookie.name === 'sf-admin-token')?.value).toBe(before?.value);
  await backend.post('/__session-behavior', { data: {} });
  expect((await context.request.get('/api/backend/api/admin/users')).status()).toBe(200);
});

test('an inconclusive 401 recheck does not delete a valid cookie', async ({ context, backend }) => {
  await backend.post('/__session-behavior', {
    data: { resourceUnauthorized: '/api/admin/users', profileStatus: 503, failProfileAfter: 1 },
  });
  const response = await context.request.get('/api/backend/api/admin/users');
  expect(response.status()).toBe(503);
  expect(response.headers()['set-cookie']).toBeUndefined();
  expect((await context.cookies()).some((cookie) => cookie.name === 'sf-admin-token')).toBe(true);
});

test('browser login survives navigation, reload and another tab without role claims', async ({ page, context, backend }) => {
  await backend.post('/__session-behavior', { data: { hideProfileRole: true, hideTokenRole: true } });
  await context.clearCookies();
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('admin@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'Iniciar sessão' }).click();
  await expect(page).toHaveURL('/dashboard');
  await page.getByRole('link', { name: 'Utilizadores', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Gestão de utilizadores' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Gestão de utilizadores' })).toBeVisible();
  const anotherTab = await context.newPage();
  await anotherTab.goto('/dashboard/utilizadores');
  await expect(anotherTab.getByRole('heading', { name: 'Gestão de utilizadores' })).toBeVisible();
});

for (const width of [1440, 390]) {
  test(`temporary failures recover without logout at ${width}px`, async ({ page, context, backend }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/dashboard/utilizadores');
    const refresh = page.getByRole('button', { name: 'Atualizar utilizadores' });
    await expect(refresh).toBeEnabled();
    const token = (await context.cookies()).find((cookie) => cookie.name === 'sf-admin-token')?.value;
    const logouts: string[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('/api/session/logout')) logouts.push(request.url());
    });
    await backend.post('/__session-behavior', { data: { profileStatus: 503 } });
    await refresh.click();
    await expect(page.getByRole('alert').filter({ hasText: 'Nao foi possivel confirmar a sessao' })).toBeVisible();
    await expect(page).toHaveURL('/dashboard/utilizadores');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Não foi possível carregar a página' })).toBeVisible();
    await page.screenshot({ path: `test-results/session-recovery-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await context.cookies()).find((cookie) => cookie.name === 'sf-admin-token')?.value).toBe(token);
    await backend.post('/__session-behavior', { data: {} });
    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(page.getByRole('heading', { name: 'Gestão de utilizadores' })).toBeVisible();
    await expect(refresh).toBeEnabled();
    expect(logouts).toEqual([]);
  });
}

test('role lookup rejects unavailable, mismatched and inactive accounts without privilege fallback', async ({ context, backend }) => {
  const token = `local.${Buffer.from(JSON.stringify({ sub: '999', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`;
  await context.addCookies([{ name: 'sf-admin-token', value: token, domain: 'localhost', path: '/' }]);
  await context.addCookies([{ name: 'sf-backoffice-role', value: 'ADMIN', domain: 'localhost', path: '/' }]);
  for (const behavior of [{ selfUserStatus: 403 }, { selfUserStatus: 404 }, { selfUserMismatch: true }]) {
    await backend.post('/__session-behavior', { data: { hideProfileRole: true, ...behavior } });
    expect((await context.request.get('/api/backend/api/admin/users')).status()).toBe(401);
  }
  await backend.post('/__session-behavior', { data: { hideProfileRole: true, selfUserStatus: 503 } });
  expect((await context.request.get('/api/backend/api/admin/users')).status()).toBe(503);
  await backend.post('/__session-behavior', { data: {} });
  await backend.post('/__profile', { data: { id: 999, roles: ['ADMIN'], status: 'INACTIVE' } });
  expect((await context.request.get('/api/backend/api/admin/users')).status()).toBe(401);
});

test('confirmed revocation still logs out while a resource restriction does not', async ({ page, context, backend }) => {
  await backend.post('/__session-behavior', { data: { resourceUnauthorized: '/api/admin/users' } });
  expect((await context.request.get('/api/backend/api/admin/users')).status()).toBe(403);
  expect((await context.cookies()).some((cookie) => cookie.name === 'sf-admin-token')).toBe(true);
  await backend.post('/__session-behavior', { data: {} });
  await page.goto('/dashboard/utilizadores');
  const refresh = page.getByRole('button', { name: 'Atualizar utilizadores' });
  await expect(refresh).toBeEnabled();
  await backend.post('/__session-behavior', { data: { profileStatus: 401 } });
  await refresh.click();
  await expect(page).toHaveURL('/login');
  expect((await context.cookies()).some((cookie) => cookie.name === 'sf-admin-token')).toBe(false);
});

test('expired tokens are never prolonged or sent to the backend', async ({ context, backend }) => {
  const token = `local.${Buffer.from(JSON.stringify({ sub: '999', role: 'ADMIN', exp: Math.floor(Date.now() / 1000) - 60 })).toString('base64url')}.test`;
  await context.addCookies([{ name: 'sf-admin-token', value: token, domain: 'localhost', path: '/' }]);
  expect((await context.request.get('/api/backend/api/admin/users')).status()).toBe(401);
  expect(await (await backend.get('/__requests')).json()).toEqual([]);
});
