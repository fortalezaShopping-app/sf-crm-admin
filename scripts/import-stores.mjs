import { spawn } from 'node:child_process';
import { access, mkdir, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, extname, join, relative, resolve } from 'node:path';

const DEFAULT_API_URL = 'https://api-demo.2-25-89-57.sslip.io';
const DEFAULT_CONTACT = 'Não informado';
const STORE_ADDRESS = 'Shopping Fortaleza, Av. 4 de Fevereiro, Luanda, Angola';
const IMAGE_EXTENSIONS = new Set(['.heic', '.jpeg', '.jpg', '.png', '.webp']);
const FLOOR_MAP = {
  'Piso 0': 'GROUND_FLOOR',
  'Piso 1': 'FLOOR_1',
  'Piso 2': 'FLOOR_2',
  'Piso 3': 'FLOOR_3',
  'Piso 4': 'FLOOR_4',
};

const NAME_ALIASES = {
  atelierelegante: ['elegante'],
  bancobai: ['bai'],
  ensaatendimentoelectronico: ['ensa'],
  essenciazen: ['essenciazen'],
  fidalga: ['fidalgaperfumaria'],
  forneriacasaletto: ['casaletto'],
  junglejuice: ['jj'],
  mdcmundodacasa: ['mdc'],
  mundialseguros: ['amundialseguros'],
  oboticario: ['boticario'],
  okokuburger: ['okoku'],
  osfilhotes: ['filhotes'],
  otronco: ['tronco'],
  pampagrill: ['pampa'],
  superfantastico: ['superfantastico'],
  tabacariaexecutiva: ['executiva'],
  tanyjacy: ['tanyjacy'],
  terrinchamaison: ['quintadaterrincha', 'terrincha'],
  tommy: ['tommyhilfiger'],
  vilebrequin: ['villebrequin'],
};

const IMAGE_OVERRIDES = {
  'unitel:GROUND_FLOOR': 'Piso_0_R-C/051_Unitel_R-C.heic',
  'unitel:FLOOR_2': 'Piso_2/022_Unitel_Piso_2.jpg',
  'otronco:FLOOR_4': 'Piso_4/014_O_Tronco.jpg',
  'otroncoskylounge:FLOOR_4': 'Piso_4_Esplanada/029_O_Tronco_Sky_Lounge.heic',
  'tommy:FLOOR_3': 'Piso_3/053_Tommy_Hilfiger.jpg',
};

const LOGO_OVERRIDES = {
  'unitel:GROUND_FLOOR': 'Piso 0/Unitel_logo.jpg',
  'unitel:FLOOR_2': 'Piso 2/Unitel_logo.jpg',
  'bancobai:FLOOR_2': 'Piso 2/Bai_logo.jpg',
  'fidalga:FLOOR_3': 'Piso 3/81674513_2471875369605250_8573315898947928064_n.jpg',
  'junglejuice:FLOOR_4': 'Piso 4/JJ-Logo-e1654258140669.png',
  'mdcmundodacasa:FLOOR_1': 'Piso 1/mdc_logo.jpg',
  'mundialseguros:FLOOR_2': 'Piso 2/90ad5578356ed37f1493f147fcc72c94b6234a63-e1724864253738.webp',
  'otronco:FLOOR_4': 'Piso 4/Tronco_Logo-1.png',
  'otroncoskylounge:FLOOR_4': 'Piso 4/O-Tronco-Sky-Lounge.png',
  'vivaseguros:FLOOR_2': 'Piso 2/logo_2d8a2b9108.png',
};

const args = new Set(process.argv.slice(2));
const isDryRun = args.has('--dry-run');
const isVerifyOnly = args.has('--verify-only');
const mobileRoot = resolve(process.env.SF_MOBILE_ROOT ?? '../sf-mobile');
const apiBaseUrl = withoutTrailingSlash(process.env.SF_API_URL ?? DEFAULT_API_URL);
const dataPath = join(mobileRoot, 'src/features/stores/storeDetails.generated.json');
const imageRoot = join(mobileRoot, 'assets/images/shop-images');
const logoRoot = join(mobileRoot, 'assets/images/shop-logos');
const outputRoot = join(tmpdir(), 'sf-store-import-assets');

await assertReadable(dataPath);
await assertReadable(imageRoot);
await assertReadable(logoRoot);

const source = JSON.parse(await readFile(dataPath, 'utf8'));
const imageFiles = await listImageFiles(imageRoot);
const logoFiles = await listImageFiles(logoRoot);
const preparedStores = source.stores.map((store, index) => prepareStore(store, index));
const invalidStores = preparedStores.filter((store) => store.errors.length > 0);

if (!args.has('--quiet')) {
  printAudit(preparedStores);
}

if (invalidStores.length > 0) {
  throw new Error(
    `A importacao foi interrompida: ${invalidStores.length} loja(s) possuem assets invalidos.`,
  );
}

if (isDryRun) {
  console.log(`\nDry-run concluido: ${preparedStores.length} lojas prontas para importar.`);
  process.exit(0);
}

if (isVerifyOnly) {
  await verifyPublicStores(preparedStores);
  process.exit(0);
}

const email = process.env.SF_ADMIN_EMAIL?.trim();
const password = process.env.SF_ADMIN_PASSWORD;

if (!email || !password) {
  throw new Error('Defina SF_ADMIN_EMAIL e SF_ADMIN_PASSWORD para executar a importacao.');
}

await mkdir(outputRoot, { recursive: true });
const token = await login(email, password);
const existingStores = await listExistingStores(token);
const existingByIdentity = new Map(
  existingStores.map((store) => [identityKey(store.name, store.floor), store]),
);
const importLimit = Math.max(
  1,
  Math.min(preparedStores.length, Number(process.env.SF_IMPORT_LIMIT ?? preparedStores.length)),
);
const storesToImport = preparedStores.slice(0, importLimit);
const results = [];

for (const [index, store] of storesToImport.entries()) {
  const current = existingByIdentity.get(store.identity);

  try {
    const assets = await optimizeAssets(store);
    const saved = current
      ? await updateStore(current.id, store.data, assets, token)
      : await createStore(store.data, assets, token);

    existingByIdentity.set(store.identity, saved);
    results.push({ action: current ? 'updated' : 'created', id: saved.id, name: store.data.name });
    console.log(
      `[${index + 1}/${storesToImport.length}] ${current ? 'Atualizada' : 'Criada'}: ${store.data.name}`,
    );
  } catch (error) {
    results.push({ action: 'failed', error: getErrorMessage(error), name: store.data.name });
    console.error(`[${index + 1}/${storesToImport.length}] Falhou: ${store.data.name}`);
  }
}

const created = results.filter((result) => result.action === 'created').length;
const updated = results.filter((result) => result.action === 'updated').length;
const failed = results.filter((result) => result.action === 'failed');

console.log(`\nImportacao concluida: ${created} criadas, ${updated} atualizadas, ${failed.length} falharam.`);

if (failed.length > 0) {
  failed.forEach((result) => console.error(`- ${result.name}: ${result.error}`));
  process.exitCode = 1;
} else if (importLimit === preparedStores.length) {
  await verifyPublicStores(preparedStores);
}

function prepareStore(store, index) {
  const floor = FLOOR_MAP[store.floor];
  const identity = identityKey(store.name, floor);
  const imageMatch = selectAsset({
    files: imageFiles,
    floor,
    name: store.name,
    override: IMAGE_OVERRIDES[identity],
    root: imageRoot,
  });
  const logoMatch = selectAsset({
    files: logoFiles,
    floor,
    name: store.name,
    override: LOGO_OVERRIDES[identity],
    root: logoRoot,
  });
  const errors = [];

  if (!floor) {
    errors.push(`andar nao suportado: ${store.floor}`);
  }

  const imagePath = imageMatch.path ?? logoMatch.path;
  const logoPath = logoMatch.path ?? imageMatch.path;

  if (!imagePath) {
    errors.push(`imagem principal nao encontrada (${imageMatch.reason})`);
  }

  if (!logoPath) {
    errors.push(`logo nao encontrado (${logoMatch.reason})`);
  }

  return {
    data: compact({
      address: STORE_ADDRESS,
      category: store.category,
      contact: store.contact?.trim() || DEFAULT_CONTACT,
      description: store.description,
      facebookUrl: store.facebookUrl,
      floor,
      instagramUrl: store.instagramUrl,
      name: store.name,
      openingHours: store.openingHours,
      sourceUrl: store.sourceUrl,
    }),
    errors,
    fallbackImage: !imageMatch.path,
    fallbackLogo: !logoMatch.path,
    identity,
    imagePath,
    index: index + 1,
    logoPath,
  };
}

function selectAsset({ files, floor, name, override, root }) {
  if (override) {
    const path = join(root, override);
    return files.includes(path)
      ? { path, reason: 'override' }
      : { path: null, reason: `override inexistente: ${override}` };
  }

  const normalizedName = normalize(name);
  const aliases = new Set([normalizedName, ...(NAME_ALIASES[normalizedName] ?? [])]);
  const candidates = files
    .map((path) => ({ path, score: scoreAsset(path, floor, aliases) }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score);

  if (candidates.length === 0) {
    return { path: null, reason: 'sem candidato' };
  }

  if (candidates[1]?.score === candidates[0].score) {
    return {
      path: null,
      reason: `empate entre ${relative(root, candidates[0].path)} e ${relative(root, candidates[1].path)}`,
    };
  }

  return { path: candidates[0].path, reason: `score ${candidates[0].score}` };
}

function scoreAsset(path, floor, aliases) {
  const fileToken = assetToken(path);
  let score = 0;

  for (const alias of aliases) {
    if (fileToken === alias) {
      score = Math.max(score, 100);
    } else if (alias.length >= 4 && (fileToken.includes(alias) || alias.includes(fileToken))) {
      score = Math.max(score, 60 - Math.abs(fileToken.length - alias.length));
    }
  }

  if (score === 0) {
    return 0;
  }

  return score + floorScore(path, floor);
}

function floorScore(path, floor) {
  const normalizedPath = normalize(relative(mobileRoot, path));
  const expectedTokens = {
    FLOOR_1: ['piso1'],
    FLOOR_2: ['piso2'],
    FLOOR_3: ['piso3'],
    FLOOR_4: ['piso4'],
    GROUND_FLOOR: ['piso0', 'rc'],
  }[floor] ?? [];

  return expectedTokens.some((token) => normalizedPath.includes(token)) ? 25 : 0;
}

function assetToken(path) {
  return normalize(
    basename(path, extname(path))
      .replace(/^\d+[_ -]*/, '')
      .replace(/cropped/gi, '')
      .replace(/logo/gi, '')
      .replace(/e\d{8,}$/i, ''),
  );
}

function printAudit(stores) {
  console.log(`Fonte: ${source.source}`);
  console.log(`Lojas: ${stores.length}; imagens: ${imageFiles.length}; logos: ${logoFiles.length}`);

  stores.forEach((store) => {
    const image = relative(mobileRoot, store.imagePath ?? 'indisponivel');
    const logo = relative(mobileRoot, store.logoPath ?? 'indisponivel');
    const markers = [
      store.fallbackImage ? 'imagem gerada a partir do logo' : null,
      store.fallbackLogo ? 'foto usada temporariamente como logo' : null,
    ].filter(Boolean);
    const suffix = markers.length > 0 ? ` [${markers.join('; ')}]` : '';
    const errors = store.errors.length > 0 ? ` ERRO: ${store.errors.join('; ')}` : '';
    console.log(`${String(store.index).padStart(2, '0')}. ${store.data.name}: ${image} | ${logo}${suffix}${errors}`);
  });
}

async function optimizeAssets(store) {
  const directory = join(outputRoot, String(store.index).padStart(2, '0'));
  const imageOutput = join(directory, 'image.jpg');
  const logoOutput = join(directory, 'logo.jpg');

  await mkdir(directory, { recursive: true });
  await convertImage(store.imagePath, imageOutput, store.fallbackImage ? 'fallback' : 'store');
  await convertImage(store.logoPath, logoOutput, 'logo');

  return { image: imageOutput, logo: logoOutput };
}

async function convertImage(input, output, kind) {
  const args = [input, '-auto-orient'];

  if (kind === 'fallback') {
    args.push(
      '-resize',
      '900x620>',
      '-background',
      '#f3e8e5',
      '-gravity',
      'center',
      '-extent',
      '1440x960',
    );
  } else if (kind === 'logo') {
    args.push('-resize', '800x800>', '-background', 'white', '-alpha', 'remove', '-alpha', 'off');
  } else {
    args.push('-resize', '1440x1440>');
  }

  args.push('-strip', '-interlace', 'Plane', '-quality', kind === 'store' ? '82' : '88', output);
  await run('convert', args);
}

async function login(email, password) {
  const response = await apiRequest('/api/auth/admin/login', {
    body: JSON.stringify({ email, password }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!response.token) {
    throw new Error('A API autenticou sem devolver token.');
  }

  return response.token;
}

async function listExistingStores(token) {
  const response = await apiRequest('/api/admin/stores?page=0&size=1000', { token });
  return Array.isArray(response.content) ? response.content : [];
}

async function createStore(data, assets, token) {
  const form = new FormData();
  form.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));
  form.append('image', await fileBlob(assets.image), basename(assets.image));
  form.append('logo', await fileBlob(assets.logo), basename(assets.logo));

  return apiRequest('/api/admin/stores', { body: form, method: 'POST', token });
}

async function updateStore(id, data, assets, token) {
  const store = await apiRequest(`/api/admin/stores/${id}`, {
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
    token,
  });

  await replaceAsset(id, 'image', assets.image, token);
  await replaceAsset(id, 'logo', assets.logo, token);
  return store;
}

async function replaceAsset(id, kind, path, token) {
  const form = new FormData();
  form.append(kind, await fileBlob(path), basename(path));
  return apiRequest(`/api/admin/stores/${id}/${kind}`, {
    body: form,
    method: 'PUT',
    token,
  });
}

async function verifyPublicStores(expectedStores) {
  const response = await apiRequest('/api/public/stores?page=0&size=1000');
  const stores = Array.isArray(response.content) ? response.content : [];
  const actualByIdentity = new Map(
    stores.map((store) => [identityKey(store.name, store.floor), store]),
  );
  const errors = [];
  const media = [];

  for (const expected of expectedStores) {
    const actual = actualByIdentity.get(expected.identity);

    if (!actual) {
      errors.push(`${expected.data.name}: nao encontrada no endpoint publico`);
      continue;
    }

    for (const field of ['category', 'contact', 'floor', 'name', 'openingHours']) {
      if (actual[field] !== expected.data[field]) {
        errors.push(
          `${expected.data.name}: ${field} esperado "${expected.data[field]}" e recebido "${actual[field]}"`,
        );
      }
    }

    if (!actual.imageUrl || !actual.logoUrl) {
      errors.push(`${expected.data.name}: URL de imagem ou logo ausente`);
      continue;
    }

    media.push(
      { kind: 'imagem', name: expected.data.name, url: actual.imageUrl },
      { kind: 'logo', name: expected.data.name, url: actual.logoUrl },
    );
  }

  if (stores.length !== expectedStores.length) {
    errors.push(`total esperado ${expectedStores.length} e recebido ${stores.length}`);
  }

  const mediaErrors = await mapWithConcurrency(media, 8, verifyMedia);
  errors.push(...mediaErrors.filter(Boolean));

  if (errors.length > 0) {
    errors.forEach((error) => console.error(`- ${error}`));
    throw new Error(`Validacao publica falhou com ${errors.length} problema(s).`);
  }

  console.log(
    `Validacao publica concluida: ${stores.length} lojas e ${media.length} ficheiros acessiveis.`,
  );
}

async function verifyMedia(item) {
  const response = await fetch(toApiUrl(item.url), {
    headers: { Accept: 'image/*' },
    signal: AbortSignal.timeout(30_000),
  });
  const contentType = response.headers.get('content-type') ?? '';

  if (!response.ok || !contentType.startsWith('image/')) {
    return `${item.name}: ${item.kind} respondeu ${response.status} (${contentType || 'sem content-type'})`;
  }

  const bytes = await response.arrayBuffer();
  return bytes.byteLength > 0 ? null : `${item.name}: ${item.kind} vazia`;
}

async function mapWithConcurrency(items, concurrency, task) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await task(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

async function fileBlob(path) {
  return new Blob([await readFile(path)], { type: 'image/jpeg' });
}

async function apiRequest(path, { body, headers = {}, method = 'GET', token } = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    body,
    headers: {
      Accept: 'application/hal+json, application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    method,
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  const data = text ? parseJson(text) : undefined;

  if (!response.ok) {
    throw new Error(`${method} ${path} respondeu ${response.status}: ${getErrorMessage(data)}`);
  }

  return data;
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function getErrorMessage(value) {
  if (value instanceof Error) {
    return value.message;
  }

  if (typeof value === 'object' && value !== null) {
    return value.message ?? value.error ?? JSON.stringify(value);
  }

  return String(value ?? 'erro desconhecido');
}

function compact(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null),
  );
}

function identityKey(name, floor) {
  return `${normalize(name)}:${floor}`;
}

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt')
    .replace(/[^a-z0-9]/g, '');
}

async function listImageFiles(root) {
  const entries = await readdir(root, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase()))
    .map((entry) => join(entry.parentPath, entry.name));
}

async function assertReadable(path) {
  try {
    await access(path);
  } catch {
    throw new Error(`Caminho obrigatorio indisponivel: ${path}`);
  }
}

async function run(command, args) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`${command} terminou com codigo ${code}: ${stderr.trim()}`));
      }
    });
  });
}

function withoutTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function toApiUrl(value) {
  return value.startsWith('http')
    ? value
    : `${apiBaseUrl}${value.startsWith('/') ? value : `/${value}`}`;
}
