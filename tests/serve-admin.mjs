// An isolated HTTPS API double; no production requests or credentials are used.
import https from 'node:https';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const directory = mkdtempSync(join(tmpdir(), 'sf-admin-e2e-'));
const cert = join(directory, 'cert.pem');
const key = join(directory, 'key.pem');
const generated = spawnSync(
  'openssl',
  [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    key,
    '-out',
    cert,
    '-days',
    '1',
    '-subj',
    '/CN=127.0.0.1',
    '-addext',
    'subjectAltName=IP:127.0.0.1',
  ],
  { stdio: 'ignore' },
);
if (generated.status !== 0)
  throw new Error('OpenSSL is required for the isolated HTTPS test API.');
let users, profile, notifications, invoices, highlights, validations, requests;
function reset() {
  const date = new Date().toISOString();
  users = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    name: i === 0 ? 'Adilson Fernandes' : `Cliente ${i + 1}`,
    email: `cliente${i + 1}@example.test`,
    phone: '+244 900 000 000',
    roles: i === 1 ? ['STORE_USER'] : ['CUSTOMER'],
    status: 'ACTIVE',
    createdAt: '2026-01-01T10:00:00Z',
    lastLogin: date,
  }));
  profile = {
    id: 999,
    name: 'Admin de testes',
    email: 'admin@example.test',
    phone: '+244 900 000 001',
    roles: ['ADMIN'],
    status: 'ACTIVE',
    createdAt: date,
    lastLogin: date,
  };
  notifications = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    title: `Notificação ${i + 1}`,
    message:
      'A sua compra foi registada. Obrigado por visitar o Shopping Fortaleza.',
    createdAt: date,
    read: false,
    type: 'POINTS',
  }));
  invoices = [1, 2, 3].map((id) => ({
    id,
    storeId: id === 1 ? 1 : 2,
    storeName: id === 1 ? 'Centro Óptico' : 'Cinemax',
    invoiceNumber: `FT-2026-${id}`,
    invoiceDate: date,
    totalAmount: id * 12000,
    customerTaxId: '000000000',
    issuerTaxId: '999999999',
    status: id === 3 ? 'REJECTED' : 'PENDING_VALIDATION',
  }));
  highlights = [
    {
      id: 1,
      storeId: 1,
      storeName: 'Centro Óptico',
      title: 'Novidades de setembro',
      bodyText: 'Conteúdo demonstrativo para testes locais.',
      status: 'PUBLISHED',
      createdAt: date,
    },
  ];
  validations = new Map();
  requests = [];
}
reset();
const server = https.createServer(
  { cert: readFileSync(cert), key: readFileSync(key) },
  async (req, res) => {
    const url = new URL(req.url, 'https://127.0.0.1:4443');
    const path = url.pathname;
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : undefined;
    const json = (data, status = 200) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(status === 204 ? undefined : JSON.stringify(data));
    };
    const page = (items) => {
      const index = Number(url.searchParams.get('page') || 0);
      const size = Number(url.searchParams.get('size') || 10);
      return json({
        content: items.slice(index * size, (index + 1) * size),
        totalElements: items.length,
        totalPages: Math.ceil(items.length / size),
        number: index,
        size,
      });
    };
    if (path === '/__reset') {
      reset();
      return json({ ok: true });
    }
    if (path === '/__requests') return json(requests);
    requests.push({ path, method: req.method, body });
    if (path === '/api/auth/profile') {
      if (req.method === 'PUT') profile = { ...profile, ...body };
      return json(profile);
    }
    if (path === '/api/admin/users') {
      if (req.method === 'POST') {
        const user = {
          ...body,
          id: users.length + 1,
          roles: [body.role],
          status: 'ACTIVE',
        };
        users.push(user);
        return json(user);
      }
      return page(users);
    }
    const userMatch = path.match(
      /^\/api\/admin\/users\/(\d+)(?:\/(activate|deactivate))?$/,
    );
    if (userMatch) {
      const user = users.find((u) => u.id === Number(userMatch[1]));
      if (!user) return json({}, 404);
      if (userMatch[2])
        user.status = userMatch[2] === 'activate' ? 'ACTIVE' : 'INACTIVE';
      if (req.method === 'PUT') Object.assign(user, body);
      return json(user);
    }
    if (/^\/api\/admin\/stores\/\d+\/users$/.test(path)) return json({}, 204);
    if (path === '/api/admin/stores')
      return page([
        { id: 1, name: 'Centro Óptico', status: 'ACTIVE' },
        { id: 2, name: 'Cinemax', status: 'ACTIVE' },
      ]);
    if (path === '/api/notifications') return page(notifications);
    if (/^\/api\/notifications\/\d+\/read$/.test(path)) {
      const item = notifications.find((n) => path.includes(`/${n.id}/`));
      item.read = true;
      return json(item);
    }
    if (path === '/api/admin/loyalty/rewards')
      return page([
        {
          id: 1,
          name: 'Estacionamento',
          requiredPoints: 50,
          stock: 12,
          type: 'Serviço',
        },
        {
          id: 2,
          name: 'Voucher de cinema',
          requiredPoints: 100,
          stock: 0,
          storeName: 'Cinemax',
        },
        { id: 3, name: 'Brinde surpresa', requiredPoints: 120 },
      ]);
    if (path === '/api/admin/store-content') {
      if (req.method === 'POST') {
        const item = {
          ...body,
          id: highlights.length + 1,
          createdAt: new Date().toISOString(),
        };
        highlights.push(item);
        return json(item);
      }
      return page(highlights);
    }
    if (/^\/api\/admin\/store-content\/\d+$/.test(path)) {
      const index = highlights.findIndex((h) => path.endsWith(`/${h.id}`));
      highlights[index] = { ...highlights[index], ...body };
      return json(highlights[index]);
    }
    if (path === '/api/admin/invoices')
      return page(
        invoices.filter(
          (i) =>
            !url.searchParams.has('status') ||
            i.status === url.searchParams.get('status'),
        ),
      );
    const invoiceMatch = path.match(
      /^\/api\/(?:admin\/)?invoices\/(\d+)(?:\/(ocr|validation|image))?$/,
    );
    if (invoiceMatch) {
      const id = Number(invoiceMatch[1]);
      if (invoiceMatch[2] === 'image') {
        res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
        return res.end(
          '<svg xmlns="http://www.w3.org/2000/svg" width="350" height="500"><rect width="350" height="500" fill="white"/><text x="25" y="55" font-family="sans-serif" font-size="20">FATURA DE TESTE</text><text x="25" y="105" font-family="sans-serif" font-size="16">Centro Optico</text><path d="M25 130H325 M25 180H325 M25 230H325 M25 330H325" stroke="#ddd"/><text x="25" y="380" font-family="sans-serif" font-size="20">TOTAL 12.000 AOA</text></svg>',
        );
      }
      if (invoiceMatch[2] === 'ocr') return json({}, 404);
      if (invoiceMatch[2] === 'validation') {
        if (req.method === 'PATCH') {
          invoices.find((i) => i.id === id).status = body.decision;
          validations.set(id, {
            ...body,
            invoiceId: id,
            validatedAt: new Date().toISOString(),
          });
        }
        return validations.has(id) ? json(validations.get(id)) : json({}, 404);
      }
      return json(invoices.find((i) => i.id === id));
    }
    if (path === '/api/auth/password-reset/request')
      return json({ accepted: true }, 202);
    if (path === '/api/auth/password-reset/confirm') return json({}, 204);
    return json({ message: `Unmocked route: ${req.method} ${path}` }, 404);
  },
);
server.listen(4443, '127.0.0.1', () => {
  const next = spawn(
    process.execPath,
    [
      'node_modules/next/dist/bin/next',
      'dev',
      '--hostname',
      '127.0.0.1',
      '--port',
      '3103',
    ],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        NEXT_PUBLIC_API_URL: 'https://127.0.0.1:4443',
        NODE_EXTRA_CA_CERTS: cert,
      },
    },
  );
  const stop = () => {
    next.kill('SIGTERM');
    server.close();
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  next.on('exit', (code) => {
    rmSync(directory, { recursive: true, force: true });
    server.close();
    process.exit(code ?? 0);
  });
});
