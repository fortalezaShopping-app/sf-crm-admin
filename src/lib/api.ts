import type { AdminSession } from '@/lib/admin-session';

export type LoginEmailRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  email?: string;
  id?: number;
  name?: string;
  token?: string;
};

export type Loja = {
  id?: number;
  nome?: string;
  razaoSocial?: string;
  nif?: string;
  descricao?: string;
  categoria?: string;
  piso?: LojaFloor;
  horario?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  imageUrl?: string;
  logoUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  sourceUrl?: string;
  estado?: 'ATIVA' | 'PENDENTE' | 'INATIVA';
  createdAt?: string;
  updatedAt?: string;
};

export type LojaFloor =
  | 'GROUND_FLOOR'
  | 'FLOOR_1'
  | 'FLOOR_2'
  | 'FLOORS_2_AND_4'
  | 'FLOOR_3'
  | 'FLOOR_4'
  | 'FLOOR_4_TERRACE';

export type LojaRequest = {
  nome: string;
  razaoSocial?: string;
  nif?: string;
  categoria: string;
  piso: LojaFloor;
  horario: string;
  telefone: string;
  descricao?: string;
  email?: string;
  endereco?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  sourceUrl?: string;
};

type StoreResponse = {
  address?: string;
  category?: string;
  contact?: string;
  createdAt?: string;
  description?: string;
  email?: string;
  floor?: LojaFloor;
  facebookUrl?: string;
  id?: number;
  imageUrl?: string;
  legalName?: string;
  logoUrl?: string;
  instagramUrl?: string;
  name?: string;
  openingHours?: string;
  sourceUrl?: string;
  status?: string;
  taxId?: string;
  updatedAt?: string;
};

type StorePageResponse = {
  content?: StoreResponse[];
  number?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
};

export type Utilizador = {
  id?: number;
  nome?: string;
  email?: string;
  telefone?: string;
  lojaId?: number | null;
  estado?: 'ATIVO' | 'INATIVO' | 'BLOQUEADO';
  role?: UserRole;
  ultimoLogin?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type UserRole = 'ADMIN' | 'CUSTOMER' | 'MANAGER' | 'STORE_USER';

export type UtilizadorRequest = {
  nome: string;
  email: string;
  telefone?: string;
  password: string;
  role: Exclude<UserRole, 'CUSTOMER'>;
  lojaId?: number;
  cargo?: string;
};

export type AtualizarUtilizadorRequest = {
  email?: string;
  nome?: string;
  telefone?: string;
};

type UserResponse = {
  createdAt?: string;
  email?: string;
  id?: number;
  lastLogin?: string;
  name?: string;
  phone?: string;
  roles?: string[];
  status?: string;
  updatedAt?: string;
};

type UserPageResponse = {
  content?: UserResponse[];
  number?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
};

export type ValidarFaturaRequest = {
  decision: 'APPROVED' | 'REJECTED';
  note?: string;
};

export type ValidacaoFatura = {
  id?: number;
  invoiceId?: number;
  validatedByUserId?: number;
  decision?: string;
  note?: string;
  validatedAt?: string;
};

export type Profile = {
  createdAt?: string;
  email?: string;
  id?: number;
  lastLogin?: string;
  name?: string;
  phone?: string;
  status?: string;
  updatedAt?: string;
};

export type UpdateProfileRequest = {
  email?: string;
  name?: string;
  phone?: string;
};

export type PageResult<T> = {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
};

export type ListOptions = {
  page?: number;
  size?: number;
};

export type DashboardSummary = {
  activeStores: number;
  pendingInvoices: number;
  receiptStatus: {
    approved: number;
    other: number;
    pending: number;
    rejected: number;
    total: number;
  };
  rewardsTotal: number;
  topStores: Array<{
    category: string;
    name: string;
    pointsTotal?: number;
    receiptCount: number;
    storeId?: number;
  }>;
  usersTotal: number;
  volumeByPeriod: Array<{
    label: string;
    transactions: number;
  }>;
};

type ApiRequestOptions = Omit<RequestInit, 'body' | 'cache'> & {
  body?: unknown;
  bypassCache?: boolean;
  cacheTtlMs?: number;
  sameOrigin?: boolean;
};

type CacheEntry = {
  data: unknown;
  expiresAt: number;
};

export const ADMIN_AUTH_EXPIRED_EVENT = 'sf-admin-auth-expired';
const DEFAULT_CACHE_TTL_MS = 20_000;
const responseCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<unknown>>();

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function loginAdminSession(payload: LoginEmailRequest) {
  return apiRequest<{ session: AdminSession }>('/api/session/login', {
    body: payload,
    cacheTtlMs: 0,
    method: 'POST',
    sameOrigin: true,
  });
}

export function getDashboardSummary(bypassCache = false) {
  return apiRequest<DashboardSummary>('/api/admin/dashboard/resumo', {
    bypassCache,
    sameOrigin: true,
  });
}

export function listLojas(options: ListOptions = {}) {
  const pagination = normalizePagination(options);
  return apiRequest<StorePageResponse>(
    `/api/admin/stores${toQueryString(pagination)}`,
  ).then((data) => ({
    items: (data.content ?? []).map(toLoja),
    page: data.number ?? pagination.page,
    size: data.size ?? pagination.size,
    totalItems: data.totalElements ?? data.content?.length ?? 0,
    totalPages: Math.max(1, data.totalPages ?? 1),
  }));
}

export async function listAllLojas(pageSize = 100) {
  const firstPage = await listLojas({ page: 0, size: pageSize });

  if (firstPage.totalPages <= 1) {
    return firstPage.items;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      listLojas({ page: index + 1, size: pageSize }),
    ),
  );

  return [firstPage, ...remainingPages].flatMap((result) => result.items);
}

export function createLoja(payload: LojaRequest, image: File, logo?: File) {
  const formData = new FormData();
  const data = toStoreRequest(payload);

  formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));
  formData.append('image', image);

  if (logo) {
    formData.append('logo', logo);
  }

  return apiRequest<StoreResponse>('/api/admin/stores', {
    body: formData,
    method: 'POST',
  }).then(toLoja);
}

export function getLoja(id: number) {
  return apiRequest<StoreResponse>(`/api/admin/stores/${id}`).then(toLoja);
}

export function updateLoja(id: number, payload: LojaRequest) {
  return apiRequest<StoreResponse>(`/api/admin/stores/${id}`, {
    body: toStoreRequest(payload),
    method: 'PUT',
  }).then(toLoja);
}

export function replaceLojaImage(id: number, image: File) {
  const formData = new FormData();
  formData.append('image', image);

  return apiRequest<StoreResponse>(`/api/admin/stores/${id}/image`, {
    body: formData,
    method: 'PUT',
  }).then(toLoja);
}

export function replaceLojaLogo(id: number, logo: File) {
  const formData = new FormData();
  formData.append('logo', logo);

  return apiRequest<StoreResponse>(`/api/admin/stores/${id}/logo`, {
    body: formData,
    method: 'PUT',
  }).then(toLoja);
}

export function getLojaImagePath(id: number, version?: number) {
  const query = version ? `?v=${version}` : '';
  return `/api/backend/api/admin/stores/${id}/image${query}`;
}

export function getLojaLogoPath(id: number, version?: number) {
  const query = version ? `?v=${version}` : '';
  return `/api/backend/api/admin/stores/${id}/logo${query}`;
}

export function deactivateLoja(id: number) {
  return apiRequest<Record<string, unknown>>(`/api/admin/stores/${id}`, {
    method: 'DELETE',
  });
}

export function listUtilizadores(role?: UserRole, options: ListOptions = {}) {
  const pagination = normalizePagination(options);
  const query = toQueryString({ ...pagination, role });

  return apiRequest<UserPageResponse | UserResponse[]>(`/api/admin/users${query}`).then((data) => {
    if (Array.isArray(data)) {
      const items = data.map((user) => toUtilizador(user, role));
      const start = pagination.page * pagination.size;

      return {
        items: items.slice(start, start + pagination.size),
        page: pagination.page,
        size: pagination.size,
        totalItems: items.length,
        totalPages: Math.max(1, Math.ceil(items.length / pagination.size)),
      };
    }

    const content = Array.isArray(data.content) ? data.content : [];

    return {
      items: content.map((user) => toUtilizador(user, role)),
      page: data.number ?? pagination.page,
      size: data.size ?? pagination.size,
      totalItems: data.totalElements ?? content.length,
      totalPages: Math.max(1, data.totalPages ?? 1),
    };
  });
}

export function createUtilizador(payload: UtilizadorRequest) {
  return apiRequest<UserResponse>('/api/admin/users', {
    body: {
      email: payload.email,
      jobTitle: payload.cargo,
      name: payload.nome,
      password: payload.password,
      phone: payload.telefone,
      role: payload.role,
      storeId: payload.lojaId,
    },
    method: 'POST',
  }).then((user) => toUtilizador(user, payload.role));
}

export function updateUtilizador(id: number, payload: AtualizarUtilizadorRequest) {
  return apiRequest<UserResponse>(`/api/admin/users/${id}`, {
    body: {
      email: payload.email,
      name: payload.nome,
      phone: payload.telefone,
    },
    method: 'PUT',
  }).then(toUtilizador);
}

export function deactivateUtilizador(id: number) {
  return apiRequest<UserResponse>(`/api/admin/users/${id}`, {
    method: 'DELETE',
  }).then(toUtilizador);
}

export function associateUtilizadorLoja(userId: number, storeId: number, jobTitle?: string) {
  return apiRequest<void>(`/api/admin/stores/${storeId}/users`, {
    body: { jobTitle, userId },
    method: 'POST',
  });
}

export function validarFatura(id: string, payload: ValidarFaturaRequest) {
  return apiRequest<ValidacaoFatura>(`/api/invoices/${encodeURIComponent(id)}/validation`, {
    body: payload,
    method: 'PATCH',
  });
}

export function getProfile() {
  return apiRequest<Profile>('/api/auth/profile');
}

export function updateProfile(payload: UpdateProfileRequest) {
  return apiRequest<Profile>('/api/auth/profile', {
    body: payload,
    method: 'PUT',
  });
}

export function clearAdminApiCache() {
  responseCache.clear();
  inFlightRequests.clear();
}

export async function apiRequest<T>(
  path: string,
  {
    body,
    bypassCache = false,
    cacheTtlMs = DEFAULT_CACHE_TTL_MS,
    headers,
    sameOrigin = false,
    ...options
  }: ApiRequestOptions = {},
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const url = toApiUrl(path, sameOrigin);
  const canCache = typeof window !== 'undefined' && method === 'GET' && cacheTtlMs > 0;

  if (canCache && !bypassCache) {
    const cached = responseCache.get(url);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }

    const inFlight = inFlightRequests.get(url);

    if (inFlight) {
      return inFlight as Promise<T>;
    }
  }

  const request = executeApiRequest<T>(url, method, body, headers, options).then((data) => {
    if (canCache) {
      responseCache.set(url, { data, expiresAt: Date.now() + cacheTtlMs });
    } else if (method !== 'GET') {
      clearAdminApiCache();
    }

    return data;
  });

  if (canCache) {
    inFlightRequests.set(url, request);
    void request.then(
      () => inFlightRequests.delete(url),
      () => inFlightRequests.delete(url),
    );
  }

  return request;
}

async function executeApiRequest<T>(
  url: string,
  method: string,
  body: unknown,
  headers: HeadersInit | undefined,
  options: Omit<RequestInit, 'body' | 'headers' | 'method'>,
) {
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'application/hal+json, application/json');

  const requestBody = buildRequestBody(body, requestHeaders);
  const response = await fetch(url, {
    ...options,
    body: requestBody,
    credentials: 'same-origin',
    headers: requestHeaders,
    method,
  });
  const data = await readResponseBody(response);

  if (!response.ok) {
    emitAuthExpired(response.status);
    throw new ApiError(getErrorMessage(data, response.status), response.status, data);
  }

  return data as T;
}

function buildRequestBody(body: unknown, headers: Headers) {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    return body;
  }

  headers.set('Content-Type', 'application/json');
  return JSON.stringify(body);
}

function toApiUrl(path: string, sameOrigin: boolean) {
  if (path.startsWith('http')) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (sameOrigin) {
    return normalizedPath;
  }

  return `/api/backend${normalizedPath}`;
}

async function readResponseBody(response: Response) {
  const text = await response.text();

  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(data: unknown, status: number) {
  if (isErrorShape(data)) {
    return data.message ?? data.erro ?? data.error ?? `A API respondeu com status ${status}.`;
  }

  return `A API respondeu com status ${status}.`;
}

function emitAuthExpired(status: number) {
  if (typeof window === 'undefined' || status !== 401) {
    return;
  }

  window.dispatchEvent(new Event(ADMIN_AUTH_EXPIRED_EVENT));
}

function isErrorShape(
  data: unknown,
): data is { error?: string; erro?: string; message?: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    (('message' in data && typeof data.message === 'string') ||
      ('erro' in data && typeof data.erro === 'string') ||
      ('error' in data && typeof data.error === 'string'))
  );
}

function toLoja(store: StoreResponse): Loja {
  const status = store.status?.toUpperCase();

  return {
    categoria: store.category,
    createdAt: store.createdAt,
    descricao: store.description,
    email: store.email,
    endereco: store.address,
    estado:
      status === 'ACTIVE' || status === 'ATIVA'
        ? 'ATIVA'
        : status === 'PENDING' || status === 'PENDENTE' || status === 'INVITED'
          ? 'PENDENTE'
          : 'INATIVA',
    facebookUrl: store.facebookUrl,
    horario: store.openingHours,
    id: store.id,
    imageUrl: store.imageUrl,
    instagramUrl: store.instagramUrl,
    nome: store.name,
    nif: store.taxId,
    piso: store.floor,
    razaoSocial: store.legalName,
    logoUrl: store.logoUrl,
    sourceUrl: store.sourceUrl,
    telefone: store.contact,
    updatedAt: store.updatedAt,
  };
}

function toStoreRequest(payload: LojaRequest) {
  return {
    address: payload.endereco,
    category: payload.categoria,
    contact: payload.telefone,
    description: payload.descricao,
    email: payload.email,
    facebookUrl: payload.facebookUrl,
    floor: payload.piso,
    instagramUrl: payload.instagramUrl,
    legalName: payload.razaoSocial,
    name: payload.nome,
    openingHours: payload.horario,
    sourceUrl: payload.sourceUrl,
    taxId: payload.nif,
  };
}

function toUtilizador(user: UserResponse, role?: UserRole): Utilizador {
  const status = user.status?.toUpperCase();
  const resolvedRole = role ?? user.roles?.find(isUserRole);

  return {
    createdAt: user.createdAt,
    email: user.email,
    estado:
      status === 'ACTIVE' ? 'ATIVO' : status === 'BLOCKED' ? 'BLOQUEADO' : 'INATIVO',
    id: user.id,
    nome: user.name,
    role: resolvedRole,
    telefone: user.phone,
    ultimoLogin: user.lastLogin,
    updatedAt: user.updatedAt,
  };
}

function isUserRole(role: string): role is UserRole {
  return role === 'ADMIN' || role === 'CUSTOMER' || role === 'MANAGER' || role === 'STORE_USER';
}

function normalizePagination(options: ListOptions): Required<ListOptions> {
  return {
    page: Math.max(0, options.page ?? 0),
    size: Math.min(100, Math.max(1, options.size ?? 10)),
  };
}

function toQueryString(values: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}
