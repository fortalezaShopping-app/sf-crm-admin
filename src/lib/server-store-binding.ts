import 'server-only';

const encoder = new TextEncoder();

export async function createStoreBinding(storeId: number, token: string) {
  const value = String(storeId);
  const signature = await sign(value, token);
  return `${value}.${signature}`;
}

export async function readStoreBinding(value: string | undefined, token: string) {
  if (!value) {
    return undefined;
  }

  const separatorIndex = value.indexOf('.');

  if (separatorIndex < 1) {
    return undefined;
  }

  const storeValue = value.slice(0, separatorIndex);
  const signature = value.slice(separatorIndex + 1);
  const storeId = Number(storeValue);

  if (!Number.isSafeInteger(storeId) || storeId < 1 || !signature) {
    return undefined;
  }

  const key = await importSigningKey(token, ['verify']);
  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    Buffer.from(signature, 'base64url'),
    encoder.encode(storeValue),
  );

  return isValid ? storeId : undefined;
}

async function sign(value: string, token: string) {
  const key = await importSigningKey(token, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return Buffer.from(signature).toString('base64url');
}

function importSigningKey(token: string, keyUsages: KeyUsage[]) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(token),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    keyUsages,
  );
}
