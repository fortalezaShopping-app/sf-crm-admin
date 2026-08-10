const DEFAULT_API_BASE_URL = 'https://api-demo.2-25-89-57.sslip.io';

export function getApiBaseUrl() {
  const apiUrl = withoutTrailingSlash(
    process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_BASE_URL,
  );

  if (!apiUrl.startsWith('https://')) {
    throw new Error('NEXT_PUBLIC_API_URL deve usar https.');
  }

  return apiUrl;
}

function withoutTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}
