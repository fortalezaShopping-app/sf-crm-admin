const DEFAULT_API_BASE_URL = 'https://187-127-227-251.sslip.io';

export function getApiBaseUrl() {
  return withoutTrailingSlash(
    process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_BASE_URL,
  );
}

function withoutTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}
