import { apiRequest } from './api';

export type Reward = {
  id: number;
  name?: string;
  description?: string;
  type?: string;
  requiredPoints?: number;
  stock?: number;
  storeName?: string;
};
export type Highlight = {
  id: number;
  storeId?: number;
  storeName?: string;
  title?: string;
  bodyText?: string;
  status?: string;
  publishedAt?: string;
  createdAt?: string;
};
export type HighlightInput = {
  storeId: number;
  title: string;
  bodyText: string;
  status: string;
};
export type ResourcePage<T> = {
  content?: T[];
  number?: number;
  totalElements?: number;
  totalPages?: number;
};

export function listRewards(page = 0) {
  return apiRequest<ResourcePage<Reward>>(
    `/api/admin/loyalty/rewards?page=${page}&size=10`,
  );
}
export function listHighlights(page = 0) {
  return apiRequest<ResourcePage<Highlight>>(
    `/api/admin/store-content?page=${page}&size=10&sort=createdAt,desc`,
  );
}
export async function listAllResources<T>(
  fetchPage: (page: number) => Promise<ResourcePage<T>>,
) {
  const first = await fetchPage(0);
  const items = [...(first.content ?? [])];
  for (let page = 1; page < (first.totalPages ?? 1); page++) {
    const next = await fetchPage(page);
    items.push(...(next.content ?? []));
  }
  return items;
}
export function saveHighlight(input: HighlightInput, id?: number) {
  return apiRequest<Highlight>(
    `/api/admin/store-content${id ? `/${id}` : ''}`,
    {
      method: id ? 'PUT' : 'POST',
      body: input,
    },
  );
}
export function requestPasswordReset(email: string) {
  return apiRequest('/api/auth/password-reset/request', {
    method: 'POST',
    body: { identifier: email },
  });
}
export function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string,
) {
  return apiRequest('/api/auth/password-reset/confirm', {
    method: 'POST',
    body: { identifier: email, code, newPassword },
  });
}
