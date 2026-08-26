export function normalizeSearchText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function getSearchTokens(query: string) {
  return [...new Set(normalizeSearchText(query).split(' ').filter(Boolean))];
}

export function matchesSearchQuery(
  query: string,
  values: Array<unknown>,
) {
  const tokens = getSearchTokens(query);

  if (tokens.length === 0) {
    return true;
  }

  const searchableText = normalizeSearchText(values.filter(Boolean).join(' '));

  return tokens.every((token) => searchableText.includes(token));
}

export function withSearchQuery(pathname: string, query: string) {
  const normalizedQuery = query.trim();

  return normalizedQuery
    ? `${pathname}?q=${encodeURIComponent(normalizedQuery)}`
    : pathname;
}
