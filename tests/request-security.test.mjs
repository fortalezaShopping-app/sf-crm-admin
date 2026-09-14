import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canProxyRequest,
  getProxyTargetUrl,
  isSameOriginRequest,
  readJsonObject,
  readRequestBody,
} from '../src/lib/request-security.ts';

const origin = 'https://admin.example.test';
const request = (headers = {}, method = 'POST') => new Request(`${origin}/api/session/login`, { method, headers });

test('mutations require same-origin evidence, never an arbitrary forwarded host', () => {
  assert.equal(isSameOriginRequest(request({ origin })), true);
  assert.equal(isSameOriginRequest(request({ 'sec-fetch-site': 'same-origin' })), true);
  assert.equal(isSameOriginRequest(request({ referer: `${origin}/login` })), true);
  for (const headers of [
    {},
    { origin: 'null' },
    { origin: 'https://evil.example.test' },
    { origin: 'https://admin.example.test.evil.test' },
    { origin: 'http://admin.example.test' },
    { origin, 'sec-fetch-site': 'cross-site' },
    { 'sec-fetch-site': 'same-site' },
    { referer: 'invalid-url' },
    { referer: 'https://evil.example.test' },
    { origin: 'https://evil.example.test', 'x-forwarded-host': 'evil.example.test' },
  ]) assert.equal(isSameOriginRequest(request(headers)), false, JSON.stringify(headers));
  assert.equal(isSameOriginRequest(request({}, 'GET')), true);
});

test('proxy paths cannot change origins or bypass protected paths through encoding', () => {
  const target = getProxyTargetUrl(['api', 'admin', 'users'], `${origin}/api/backend/api/admin/users?page=1&size=10`, 'https://api.example.test');
  assert.equal(target.href, 'https://api.example.test/api/admin/users?page=1&size=10');
  for (const path of [
    [], ['api'], ['auth', 'profile'], ['api', '..', 'store'],
    ['api', 'store%2fpurchases'], ['api', 'store%252fpurchases'],
    ['api', 'store/purchases'], ['api', 'store\\purchases'],
    ['api', 'store;purchases'], ['api', 'store', ''], ['api', '//evil.test'],
  ]) assert.throws(() => getProxyTargetUrl(path, origin, 'https://api.example.test'), { status: 400 });
});

test('merchants can only access their store and own account resources', () => {
  const merchant = { role: 'STORE_USER', storeId: 12, expiresAt: null };
  assert.equal(canProxyRequest(merchant, '/api/public/stores/12/logo', 'GET'), true);
  assert.equal(canProxyRequest(merchant, '/api/auth/profile', 'PUT'), true);
  assert.equal(canProxyRequest(merchant, '/api/notifications/1/read', 'PATCH'), true);
  for (const [path, method] of [
    ['/api/admin/users', 'GET'], ['/api/admin/stores/12', 'PUT'],
    ['/api/public/stores/13', 'GET'], ['/api/public/stores/12', 'POST'],
    ['/api/auth/profile', 'DELETE'], ['/api/invoices/1/validation', 'PATCH'],
    ['/api/store/purchases/scan', 'POST'], ['/api/store/purchases/1/confirm', 'POST'],
  ]) assert.equal(canProxyRequest(merchant, path, method), false);
  for (const role of ['ADMIN', 'MANAGER']) {
    assert.equal(canProxyRequest({ role }, '/api/admin/users', 'GET'), true);
    assert.equal(canProxyRequest({ role }, '/api/store/purchases/1/confirm', 'POST'), false);
  }
});

test('request size limits apply with or without Content-Length', async () => {
  assert.equal(new TextDecoder().decode(await readRequestBody(new Request(origin, { method: 'POST', body: '1234' }), 4)), '1234');
  for (const headers of [{}, { 'content-length': '5' }, { 'content-length': '1' }]) {
    await assert.rejects(readRequestBody(new Request(origin, { method: 'POST', body: '12345', headers }), 4), { status: 413 });
  }
});

test('JSON input rejects malformed data and unsupported content types', async () => {
  const json = (body, type = 'application/json') => new Request(origin, { method: 'POST', body, headers: { 'content-type': type } });
  for (const body of ['null', '[]', 'true', '123', '"string"', '{broken', '']) {
    await assert.rejects(readJsonObject(json(body)), { status: 400 });
  }
  await assert.rejects(readJsonObject(json('{}', 'text/plain')), { status: 415 });
  assert.deepEqual(await readJsonObject(json('{"amount":10}', 'application/json; charset=utf-8')), { amount: 10 });
});
