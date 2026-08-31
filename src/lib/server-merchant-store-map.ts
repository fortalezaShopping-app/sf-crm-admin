import 'server-only';

type MerchantIdentity = {
  email?: string;
  id?: number;
};

const ENV_NAME = 'SF_MERCHANT_STORE_MAP';
const DEFAULT_TEMPORARY_STORE_MAP: Record<string, number> = {
  'afriteste@teste.com': 9,
  'calvin@teste.com': 64,
  'id:8': 9,
  'id:9': 64,
};

export function getTemporaryMerchantStoreId({ email, id }: MerchantIdentity) {
  const rawMap = process.env[ENV_NAME]?.trim();
  const storeMap = rawMap
    ? { ...DEFAULT_TEMPORARY_STORE_MAP, ...parseStoreMap(rawMap) }
    : DEFAULT_TEMPORARY_STORE_MAP;
  const keys = [
    toPositiveInteger(id) ? `id:${id}` : undefined,
    normalizeEmail(email),
  ].filter((key): key is string => Boolean(key));

  for (const key of keys) {
    const storeId = toPositiveInteger(storeMap[key]);

    if (storeId) {
      return storeId;
    }
  }

  return undefined;
}

function parseStoreMap(rawMap: string): Record<string, unknown> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawMap);
  } catch {
    throw new Error(`${ENV_NAME} deve conter um objeto JSON valido.`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${ENV_NAME} deve conter um objeto JSON.`);
  }

  return Object.fromEntries(
    Object.entries(parsed).map(([key, value]) => [normalizeMapKey(key), value]),
  );
}

function normalizeMapKey(key: string) {
  const trimmedKey = key.trim();
  return trimmedKey.toLowerCase().startsWith('id:')
    ? `id:${trimmedKey.slice(3).trim()}`
    : trimmedKey.toLowerCase();
}

function normalizeEmail(email: string | undefined) {
  const normalized = email?.trim().toLowerCase();
  return normalized || undefined;
}

function toPositiveInteger(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}
