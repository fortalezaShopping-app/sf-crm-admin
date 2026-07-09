import { getApiBaseUrl } from '@/lib/env';

export type LoginEmailRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token?: string;
  tipo?: string;
  nome?: string;
  role?: string | null;
  id?: number;
  lojaId?: number | null;
  email?: string;
};

export type Loja = {
  id?: number;
  nome?: string;
  nif?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  nivelAdesao?: number;
  estado?: 'ATIVA' | 'INATIVA';
  createdAt?: string;
  updatedAt?: string;
};

export type LojaRequest = {
  nome: string;
  nif: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  nivelAdesao?: number;
};

export type NivelLojaRequest = {
  nivelAdesao: number;
};

export type Utilizador = {
  id?: number;
  nome?: string;
  email?: string;
  telefone?: string;
  estado?: 'ATIVO' | 'INATIVO' | 'BLOQUEADO';
  role?: string;
  tipo?: string;
  ultimoLogin?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type UtilizadorRequest = {
  nome: string;
  email: string;
  telefone?: string;
  password: string;
  role?: 'ADMIN' | 'GESTOR' | 'LOJISTA' | 'CLIENTE' | 'SUPER_ADMIN';
  lojaId?: number;
  cargo?: string;
};

export type AtualizarUtilizadorRequest = {
  email?: string;
  nome?: string;
  telefone?: string;
};

export type Recompensa = {
  id?: number;
  nome?: string;
  descricao?: string;
  tipo?: 'BRINDE' | 'DESCONTO' | 'CUPAO' | 'SERVICO';
  pontosNecessarios?: number;
  stock?: number;
  estado?: 'ATIVA' | 'INATIVA' | 'ESGOTADA';
  createdAt?: string;
  updatedAt?: string;
};

export type RecompensaRequest = {
  nome: string;
  descricao?: string;
  tipo?: 'BRINDE' | 'DESCONTO' | 'CUPAO' | 'SERVICO';
  pontosNecessarios: number;
  stock: number;
  estado?: 'ATIVA' | 'INATIVA' | 'ESGOTADA';
};

export type RegraPontuacao = {
  id?: number;
  nome?: string;
  valorMinimo?: number;
  valorPorPonto?: number;
  pontosPorValor?: number;
  multiplicador?: number;
  ativo?: boolean;
  dataInicio?: string;
  dataFim?: string;
  prazoSubmissaoDias?: number;
  validadePontosMeses?: number;
};

export type RegraPontuacaoRequest = {
  nome: string;
  valorMinimo?: number;
  valorPorPonto?: number;
  pontosPorValor?: number;
  multiplicador?: number;
  ativo?: boolean;
  dataInicio?: string;
  dataFim?: string;
  prazoSubmissaoDias?: number;
  validadePontosMeses?: number;
};

export type ValidarFaturaRequest = {
  estado: 'APROVADA' | 'REJEITADA';
  observacao?: string;
};

export type Configuracao = {
  chave?: string;
  descricao?: string;
  id?: number;
  updatedAt?: string;
  valor?: string;
};

export type ConfiguracaoRequest = {
  chave: string;
  descricao?: string;
  valor: string;
};

export type LogAuditoria = {
  acao?: string;
  createdAt?: string;
  dadosAnteriores?: string;
  dadosNovos?: string;
  entidade?: string;
  entidadeId?: number;
  id?: number;
  utilizador?: string;
};

export type BackofficeRole = 'ADMIN' | 'GESTOR' | 'LOJISTA';

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  token?: string | null;
};

export const ADMIN_AUTH_EXPIRED_EVENT = 'sf-admin-auth-expired';

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

export function adminLogin(payload: LoginEmailRequest) {
  return apiRequest<LoginResponse>('/api/auth/login', {
    body: payload,
    method: 'POST',
  });
}

export function getMe(token: string) {
  return apiRequest<LoginResponse>('/api/auth/me', { token });
}

export function findUtilizadorByEmail(token: string, email: string) {
  const query = new URLSearchParams({ email });

  return apiRequest<Utilizador>(`/api/utilizadors/search/findByEmailIgnoreCase?${query.toString()}`, {
    token,
  });
}

export async function resolveBackofficeRole(token: string, utilizadorId?: number) {
  if (!utilizadorId) {
    return null;
  }

  const roles: BackofficeRole[] = ['ADMIN', 'GESTOR', 'LOJISTA'];

  for (const role of roles) {
    if (await hasUtilizadorRole(token, utilizadorId, role)) {
      return role;
    }
  }

  return null;
}

export async function hasUtilizadorRole(token: string, utilizadorId: number, role: BackofficeRole) {
  const query = new URLSearchParams({
    role,
    utilizadorId: String(utilizadorId),
  });

  try {
    return await apiRequest<boolean>(
      `/api/utilizadorRoles/search/existsByUtilizadorIdAndRoleNome?${query.toString()}`,
      { token },
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return false;
    }

    throw error;
  }
}

export function listLojas(token: string) {
  return apiRequest<Loja[] | unknown>('/api/admin/lojas', { token }).then((data) =>
    getCollection<Loja>(data, 'lojas'),
  );
}

export function createLoja(token: string, payload: LojaRequest) {
  return apiRequest<Loja>('/api/admin/lojas', {
    body: payload,
    method: 'POST',
    token,
  });
}

export function updateLojaNivel(token: string, id: number, payload: NivelLojaRequest) {
  return apiRequest<Record<string, unknown>>(`/api/admin/lojas/${id}`, {
    body: payload,
    method: 'PATCH',
    token,
  });
}

export function deactivateLoja(token: string, id: number) {
  return apiRequest<Record<string, unknown>>(`/api/admin/lojas/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function listUtilizadores(token: string, role?: string) {
  const query = role ? `?role=${encodeURIComponent(role)}` : '';

  return apiRequest<Utilizador[] | unknown>(`/api/admin/utilizadores${query}`, { token }).then(
    (data) => getCollection<Utilizador>(data, 'utilizadors'),
  );
}

export function createUtilizador(token: string, payload: UtilizadorRequest) {
  return apiRequest<Utilizador>('/api/admin/utilizadores', {
    body: payload,
    method: 'POST',
    token,
  });
}

export function updateUtilizador(token: string, id: number, payload: AtualizarUtilizadorRequest) {
  return apiRequest<Utilizador>(`/api/admin/utilizadores/${id}`, {
    body: payload,
    method: 'PUT',
    token,
  });
}

export function deactivateUtilizador(token: string, id: number) {
  return apiRequest<Record<string, unknown>>(`/api/admin/utilizadores/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function listRecompensas(token: string) {
  return apiRequest<unknown>('/api/recompensas?size=100', { token }).then((data) =>
    getCollection<Recompensa>(data, 'recompensas'),
  );
}

export function createRecompensa(token: string, payload: RecompensaRequest) {
  return apiRequest<Recompensa>('/api/recompensas', {
    body: {
      ...payload,
      estado: payload.estado ?? 'ATIVA',
      tipo: payload.tipo ?? 'BRINDE',
    },
    method: 'POST',
    token,
  });
}

export function deleteRecompensa(token: string, id: number) {
  return apiRequest<void>(`/api/recompensas/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function listRegrasPontuacao(token: string) {
  return apiRequest<unknown>('/api/regraPontuacaos?size=100', { token }).then((data) =>
    getCollection<RegraPontuacao>(data, 'regraPontuacaos'),
  );
}

export function createRegraPontuacao(token: string, payload: RegraPontuacaoRequest) {
  return apiRequest<RegraPontuacao>('/api/regraPontuacaos', {
    body: {
      ativo: payload.ativo ?? true,
      multiplicador: payload.multiplicador ?? 1,
      pontosPorValor: payload.pontosPorValor ?? 1,
      prazoSubmissaoDias: payload.prazoSubmissaoDias ?? 7,
      validadePontosMeses: payload.validadePontosMeses ?? 12,
      valorMinimo: payload.valorMinimo ?? 0,
      valorPorPonto: payload.valorPorPonto ?? 1000,
      nome: payload.nome,
      dataInicio: payload.dataInicio,
      dataFim: payload.dataFim,
    },
    method: 'POST',
    token,
  });
}

export function deleteRegraPontuacao(token: string, id: number) {
  return apiRequest<void>(`/api/regraPontuacaos/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function validarFatura(token: string, id: string, payload: ValidarFaturaRequest) {
  return apiRequest<Record<string, unknown>>(`/api/faturas/${encodeURIComponent(id)}/validar`, {
    body: payload,
    method: 'PATCH',
    token,
  });
}

export function listConfiguracoes(token: string) {
  return apiRequest<unknown>('/api/configuracaos?size=100', { token }).then((data) =>
    getCollection<Configuracao>(data, 'configuracaos'),
  );
}

export function createConfiguracao(token: string, payload: ConfiguracaoRequest) {
  return apiRequest<Configuracao>('/api/configuracaos', {
    body: payload,
    method: 'POST',
    token,
  });
}

export function updateConfiguracao(token: string, id: number, payload: ConfiguracaoRequest) {
  return apiRequest<Configuracao>(`/api/configuracaos/${id}`, {
    body: payload,
    method: 'PUT',
    token,
  });
}

export function deleteConfiguracao(token: string, id: number) {
  return apiRequest<void>(`/api/configuracaos/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function listLogsAuditoria(token: string) {
  return apiRequest<unknown>('/api/logAuditorias?size=50&sort=createdAt,desc', { token }).then(
    (data) => getCollection<LogAuditoria>(data, 'logAuditorias'),
  );
}

export async function apiRequest<T>(
  path: string,
  { body, headers, token, ...options }: ApiRequestOptions = {},
): Promise<T> {
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'application/hal+json, application/json');

  const requestBody = buildRequestBody(body, requestHeaders);

  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(toApiUrl(path), {
    ...options,
    body: requestBody,
    headers: requestHeaders,
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

function toApiUrl(path: string) {
  if (path.startsWith('http')) {
    return path;
  }

  if (typeof window !== 'undefined') {
    return `/api/backend${path.startsWith('/') ? path : `/${path}`}`;
  }

  return `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
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
  if (typeof window === 'undefined' || (status !== 401 && status !== 403)) {
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

function getCollection<T>(data: unknown, embeddedKey: string): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (!isRecord(data) || !isRecord(data._embedded)) {
    return [];
  }

  const value = data._embedded[embeddedKey];

  return Array.isArray(value) ? (value as T[]) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
