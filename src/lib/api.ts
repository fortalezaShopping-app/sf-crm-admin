import type { AdminSession } from '@/lib/admin-session';

export type LoginEmailRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken?: string;
  access_token?: string;
  email?: string;
  id?: number;
  jwt?: string;
  name?: string;
  role?: UserRole | string;
  storeId?: number;
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
  invoiceTemplateUrl?: string;
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
  razaoSocial: string;
  nif: string;
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
  invoiceTemplateUrl?: string;
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
  roles?: UserRole[];
  photoUrl?: string;
  twoFactorEnabled?: boolean;
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
  photoUrl?: string;
  roles?: string[];
  status?: string;
  twoFactorEnabled?: boolean;
  updatedAt?: string;
};

type UserPageResponse = {
  content?: UserResponse[];
  number?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
};

export type Evento = {
  id?: number;
  titulo?: string;
  descricao?: string;
  imageUrl?: string;
  dataInicio?: string;
  dataFim?: string;
  local?: string;
  estado?: string;
  criadoPor?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type EventoRequest = {
  titulo: string;
  descricao?: string;
  dataInicio: string;
  dataFim: string;
  local?: string;
};

type EventResponse = {
  id?: number;
  title?: string;
  description?: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  status?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

type EventPageResponse = {
  content?: EventResponse[];
  number?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
};

export type CarouselSlide = {
  createdAt?: string;
  id?: number;
  imageUrl?: string;
  title?: string;
  updatedAt?: string;
};

export type CarouselSlideRequest = {
  title: string;
};

type CarouselResponse = {
  createdAt?: string;
  id?: number;
  imageUrl?: string;
  title?: string;
  updatedAt?: string;
};

type CarouselPageResponse = {
  content?: CarouselResponse[];
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

export type FaturaAdmin = {
  customerTaxId?: string;
  id?: number;
  imageUrl?: string;
  invoiceDate?: string;
  invoiceNumber?: string;
  issuerTaxId?: string;
  note?: string;
  status?: string;
  storeId?: number;
  storeName?: string;
  totalAmount?: number;
};

export type OcrFatura = {
  confidence?: number;
  extractedCustomerTaxId?: string;
  extractedInvoiceDate?: string;
  extractedInvoiceNumber?: string;
  extractedIssuerTaxId?: string;
  extractedText?: string;
  extractedTotalAmount?: number;
  id?: number;
};

type FaturaAdminPageResponse = {
  content?: FaturaAdmin[];
  number?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
};

export type ListFaturasOptions = ListOptions & {
  status?: string;
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

export type Notificacao = {
  createdAt?: string;
  id?: number;
  lida?: boolean;
  mensagem?: string;
  titulo?: string;
  tipo?: string;
};

type NotificationResponse = {
  createdAt?: string;
  id?: number;
  message?: string;
  read?: boolean;
  title?: string;
  type?: string;
};

type NotificationPageResponse = {
  content?: NotificationResponse[];
  number?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
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

export type StorePurchaseScanRequest = {
  qrContent: string;
  storeId: number;
};

export type StorePurchaseScanResponse = {
  customerId?: number;
  customerName?: string;
  expiresAt?: string;
  purchaseId: string;
  status?: string;
  storeId?: number;
  storeName?: string;
};

export type StorePurchaseResponse = {
  amount?: number;
  customerId?: number;
  customerName?: string;
  points?: number;
  purchaseId?: string;
  status?: string;
  storeId?: number;
  storeName?: string;
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
  return apiRequest<{ redirectTo: string; session: AdminSession }>('/api/session/login', {
    body: payload,
    cacheTtlMs: 0,
    method: 'POST',
    sameOrigin: true,
  });
}

export function scanStorePurchase(payload: StorePurchaseScanRequest) {
  return apiRequest<StorePurchaseScanResponse>('/api/store/purchases/scan', {
    body: payload,
    cacheTtlMs: 0,
    method: 'POST',
  });
}

export function confirmStorePurchase(purchaseId: string, amount: number) {
  return apiRequest<StorePurchaseResponse>(
    `/api/store/purchases/${encodeURIComponent(purchaseId)}/confirm`,
    {
      body: { amount },
      cacheTtlMs: 0,
      method: 'POST',
    },
  );
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

export function listPublicLojas(options: ListOptions = {}) {
  const pagination = normalizePagination(options);

  return apiRequest<StorePageResponse>(
    `/api/public/stores${toQueryString({
      ...pagination,
      sort: 'name,asc',
    })}`,
  ).then((data) => {
    const content = Array.isArray(data.content) ? data.content : [];

    return {
      items: content.map(toLoja),
      page: data.number ?? pagination.page,
      size: data.size ?? pagination.size,
      totalItems: data.totalElements ?? content.length,
      totalPages: Math.max(1, data.totalPages ?? 1),
    } satisfies PageResult<Loja>;
  });
}

export async function listAllPublicLojas(pageSize = 100) {
  const firstPage = await listPublicLojas({ page: 0, size: pageSize });

  if (firstPage.totalPages <= 1) {
    return firstPage.items;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      listPublicLojas({ page: index + 1, size: pageSize }),
    ),
  );

  return [firstPage, ...remainingPages].flatMap((result) => result.items);
}

export function createLoja(
  payload: LojaRequest,
  image: File,
  invoiceTemplate: File,
  logo?: File,
) {
  const formData = new FormData();
  const data = toStoreRequest(payload);

  formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));
  formData.append('image', image);
  formData.append('invoiceTemplate', invoiceTemplate);

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

export function replaceLojaInvoiceTemplate(id: number, invoiceTemplate: File) {
  const formData = new FormData();
  formData.append('invoiceTemplate', invoiceTemplate);

  return apiRequest<StoreResponse>(`/api/admin/stores/${id}/invoice-template`, {
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

export function getPublicLojaLogoPath(id: number, version?: number) {
  const query = version ? `?v=${version}` : '';
  return `/api/backend/api/public/stores/${id}/logo${query}`;
}

export function getLojaInvoiceTemplatePath(id: number, version?: number) {
  const query = version ? `?v=${version}` : '';
  return `/api/backend/api/admin/stores/${id}/invoice-template${query}`;
}

export function activateLoja(id: number) {
  return apiRequest<StoreResponse>(`/api/admin/stores/${id}/activate`, {
    method: 'PATCH',
  }).then(toLoja);
}

export function deactivateLoja(id: number) {
  return apiRequest<StoreResponse>(`/api/admin/stores/${id}/deactivate`, {
    method: 'PATCH',
  }).then(toLoja);
}

export function toggleLoja(id: number) {
  return apiRequest<StoreResponse>(`/api/admin/stores/${id}/toggle`, {
    method: 'PATCH',
  }).then(toLoja);
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

export async function listAllUtilizadores(role?: UserRole, pageSize = 100) {
  const firstPage = await listUtilizadores(role, { page: 0, size: pageSize });

  if (firstPage.totalPages <= 1) {
    return firstPage.items;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      listUtilizadores(role, { page: index + 1, size: pageSize }),
    ),
  );

  return [firstPage, ...remainingPages].flatMap((result) => result.items);
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
  return apiRequest<UserResponse>(`/api/admin/users/${id}/deactivate`, {
    method: 'PATCH',
  }).then(toUtilizador);
}

export function activateUtilizador(id: number) {
  return apiRequest<UserResponse>(`/api/admin/users/${id}/activate`, {
    method: 'PATCH',
  }).then(toUtilizador);
}

export function toggleUtilizador(id: number) {
  return apiRequest<UserResponse>(`/api/admin/users/${id}/toggle`, {
    method: 'PATCH',
  }).then(toUtilizador);
}

export function associateUtilizadorLoja(userId: number, storeId: number, jobTitle?: string) {
  return apiRequest<void>(`/api/admin/stores/${storeId}/users`, {
    body: { jobTitle, userId },
    method: 'POST',
  });
}

export function listEventos(options: ListOptions = {}) {
  const pagination = normalizePagination(options);

  return apiRequest<EventPageResponse>(
    `/api/admin/events${toQueryString({
      ...pagination,
      sort: 'startDate,desc',
    })}`,
  ).then((data) => {
    const content = Array.isArray(data.content) ? data.content : [];

    return {
      items: content.map(toEvento),
      page: data.number ?? pagination.page,
      size: data.size ?? pagination.size,
      totalItems: data.totalElements ?? content.length,
      totalPages: Math.max(1, data.totalPages ?? 1),
    };
  });
}

export async function listAllEventos(pageSize = 100) {
  const firstPage = await listEventos({ page: 0, size: pageSize });

  if (firstPage.totalPages <= 1) {
    return firstPage.items;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      listEventos({ page: index + 1, size: pageSize }),
    ),
  );

  return [firstPage, ...remainingPages].flatMap((result) => result.items);
}

export function createEvento(payload: EventoRequest, image?: File) {
  const formData = toEventFormData(payload, image);

  return apiRequest<EventResponse>('/api/admin/events', {
    body: formData,
    method: 'POST',
  }).then(toEvento);
}

export function getEvento(id: number) {
  return apiRequest<EventResponse>(`/api/admin/events/${id}`).then(toEvento);
}

export function updateEvento(id: number, payload: EventoRequest) {
  return apiRequest<EventResponse>(`/api/admin/events/${id}`, {
    body: toEventFormData(payload),
    method: 'PUT',
  }).then(toEvento);
}

export function replaceEventoImage(id: number, image: File) {
  const formData = new FormData();
  formData.append('image', image);

  return apiRequest<EventResponse>(`/api/admin/events/${id}/image`, {
    body: formData,
    method: 'PUT',
  }).then(toEvento);
}

export function getEventoImagePath(id: number, version?: number) {
  const query = version ? `?v=${version}` : '';
  return `/api/backend/api/admin/events/${id}/image${query}`;
}

export function activateEvento(id: number) {
  return updateEventoStatus(id, 'activate');
}

export function deactivateEvento(id: number) {
  return updateEventoStatus(id, 'deactivate');
}

export function toggleEvento(id: number) {
  return updateEventoStatus(id, 'toggle');
}

export function cancelEvento(id: number) {
  return updateEventoStatus(id, 'cancel');
}

export function deleteEvento(id: number) {
  return apiRequest<void>(`/api/admin/events/${id}`, {
    method: 'DELETE',
  });
}

export function listCarouselSlides(options: ListOptions = {}) {
  const pagination = normalizePagination(options);

  return apiRequest<CarouselPageResponse>(
    `/api/admin/carousel-slides${toQueryString(pagination)}`,
  ).then((data) => {
    const content = Array.isArray(data.content) ? data.content : [];

    return {
      items: content.map(toCarouselSlide),
      page: data.number ?? pagination.page,
      size: data.size ?? pagination.size,
      totalItems: data.totalElements ?? content.length,
      totalPages: Math.max(1, data.totalPages ?? 1),
    };
  });
}

export async function listAllCarouselSlides(pageSize = 100) {
  const firstPage = await listCarouselSlides({ page: 0, size: pageSize });

  if (firstPage.totalPages <= 1) {
    return firstPage.items;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      listCarouselSlides({ page: index + 1, size: pageSize }),
    ),
  );

  return [firstPage, ...remainingPages].flatMap((result) => result.items);
}

export function createCarouselSlide(payload: CarouselSlideRequest, image: File) {
  return apiRequest<CarouselResponse>('/api/admin/carousel-slides', {
    body: toCarouselFormData(payload, image),
    method: 'POST',
  }).then(toCarouselSlide);
}

export function getCarouselSlide(id: number) {
  return apiRequest<CarouselResponse>(`/api/admin/carousel-slides/${id}`).then(
    toCarouselSlide,
  );
}

export function updateCarouselSlide(
  id: number,
  payload: CarouselSlideRequest,
  image?: File,
) {
  return apiRequest<CarouselResponse>(`/api/admin/carousel-slides/${id}`, {
    body: toCarouselFormData(payload, image),
    method: 'PUT',
  }).then(toCarouselSlide);
}

export function deleteCarouselSlide(id: number) {
  return apiRequest<void>(`/api/admin/carousel-slides/${id}`, {
    method: 'DELETE',
  });
}

export function getCarouselSlideImagePath(id: number, version?: number) {
  const query = version ? `?v=${version}` : '';
  return `/api/backend/api/admin/carousel-slides/${id}/image${query}`;
}

export function listNotificacoes(options: ListOptions = {}) {
  const pagination = normalizePagination(options);

  return apiRequest<NotificationPageResponse>(
    `/api/notifications${toQueryString(pagination)}`,
  ).then((data) => {
    const content = Array.isArray(data.content) ? data.content : [];

    return {
      items: content.map(toNotificacao),
      page: data.number ?? pagination.page,
      size: data.size ?? pagination.size,
      totalItems: data.totalElements ?? content.length,
      totalPages: Math.max(1, data.totalPages ?? 1),
    };
  });
}

export async function listAllNotificacoes(pageSize = 100) {
  const firstPage = await listNotificacoes({ page: 0, size: pageSize });

  if (firstPage.totalPages <= 1) {
    return firstPage.items;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      listNotificacoes({ page: index + 1, size: pageSize }),
    ),
  );

  return [firstPage, ...remainingPages].flatMap((result) => result.items);
}

export function marcarNotificacaoComoLida(id: number) {
  return apiRequest<NotificationResponse>(`/api/notifications/${id}/read`, {
    method: 'PATCH',
  }).then(toNotificacao);
}

export function listFaturas(options: ListFaturasOptions = {}) {
  const pagination = normalizePagination(options);

  return apiRequest<FaturaAdminPageResponse>(
    `/api/admin/invoices${toQueryString({
      ...pagination,
      sort: 'id,desc',
      status: options.status,
    })}`,
  ).then((data): PageResult<FaturaAdmin> => {
    const items = Array.isArray(data.content) ? data.content : [];

    return {
      items,
      page: data.number ?? pagination.page,
      size: data.size ?? pagination.size,
      totalItems: data.totalElements ?? items.length,
      totalPages: Math.max(1, data.totalPages ?? 1),
    };
  });
}

export async function listAllFaturas(
  options: Pick<ListFaturasOptions, 'status'> = {},
  pageSize = 100,
) {
  const firstPage = await listFaturas({
    page: 0,
    size: pageSize,
    status: options.status,
  });

  if (firstPage.totalPages <= 1) {
    return firstPage.items;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      listFaturas({
        page: index + 1,
        size: pageSize,
        status: options.status,
      }),
    ),
  );

  return [firstPage, ...remainingPages].flatMap((result) => result.items);
}

export function getFatura(id: number) {
  return apiRequest<FaturaAdmin>(`/api/admin/invoices/${id}`);
}

export function getFaturaOcr(id: number) {
  return apiRequest<OcrFatura>(`/api/admin/invoices/${id}/ocr`);
}

export function getFaturaValidacao(id: number) {
  return apiRequest<ValidacaoFatura | undefined>(
    `/api/admin/invoices/${id}/validation`,
  ).then((validation) => validation ?? null);
}

export function getFaturaImagePath(id: number, version?: number) {
  const query = version ? `?v=${version}` : '';
  return `/api/backend/api/admin/invoices/${id}/image${query}`;
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
    invoiceTemplateUrl: store.invoiceTemplateUrl,
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
  const roles = user.roles?.filter(isUserRole) ?? [];
  const resolvedRole = role ?? roles[0];

  return {
    createdAt: user.createdAt,
    email: user.email,
    estado:
      status === 'ACTIVE' ? 'ATIVO' : status === 'BLOCKED' ? 'BLOQUEADO' : 'INATIVO',
    id: user.id,
    nome: user.name,
    photoUrl: user.photoUrl,
    role: resolvedRole,
    roles,
    telefone: user.phone,
    twoFactorEnabled: user.twoFactorEnabled,
    ultimoLogin: user.lastLogin,
    updatedAt: user.updatedAt,
  };
}

function toEvento(event: EventResponse): Evento {
  return {
    createdAt: event.createdAt,
    criadoPor: event.createdBy,
    dataFim: event.endDate,
    dataInicio: event.startDate,
    descricao: event.description,
    estado: event.status,
    id: event.id,
    imageUrl: event.imageUrl,
    local: event.location,
    titulo: event.title,
    updatedAt: event.updatedAt,
  };
}

function toEventFormData(payload: EventoRequest, image?: File) {
  const formData = new FormData();
  const data = {
    description: payload.descricao,
    endDate: payload.dataFim,
    location: payload.local,
    startDate: payload.dataInicio,
    title: payload.titulo,
  };

  formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));

  if (image) {
    formData.append('image', image);
  }

  return formData;
}

function toCarouselSlide(slide: CarouselResponse): CarouselSlide {
  return {
    createdAt: slide.createdAt,
    id: slide.id,
    imageUrl: slide.imageUrl,
    title: slide.title,
    updatedAt: slide.updatedAt,
  };
}

function toCarouselFormData(payload: CarouselSlideRequest, image?: File) {
  const formData = new FormData();
  formData.append(
    'data',
    new Blob([JSON.stringify({ title: payload.title })], {
      type: 'application/json',
    }),
  );

  if (image) {
    formData.append('image', image);
  }

  return formData;
}

function updateEventoStatus(
  id: number,
  action: 'activate' | 'cancel' | 'deactivate' | 'toggle',
) {
  return apiRequest<EventResponse>(`/api/admin/events/${id}/${action}`, {
    method: 'PATCH',
  }).then(toEvento);
}

function toNotificacao(notification: NotificationResponse): Notificacao {
  return {
    createdAt: notification.createdAt,
    id: notification.id,
    lida: notification.read,
    mensagem: notification.message,
    titulo: notification.title,
    tipo: notification.type,
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
