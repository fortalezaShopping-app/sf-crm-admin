import { NextResponse } from 'next/server';

import type {
  DashboardSummary,
  Loja,
} from '@/lib/api';
import { backendRequest, BackendApiError } from '@/lib/server-backend';
import { getAdminToken } from '@/lib/server-auth';

const SUMMARY_FETCH_SIZE = 1000;
const DASHBOARD_PERIOD_DAYS = 30;
const VOLUME_BUCKETS = 6;

type StoreResponse = {
  address?: string;
  category?: string;
  contact?: string;
  createdAt?: string;
  email?: string;
  floor?: Loja['piso'];
  id?: number;
  imageUrl?: string;
  name?: string;
  status?: string;
};

type StorePage = {
  content?: StoreResponse[];
  totalElements?: number;
};

type UserResponse = {
  id?: number;
};

type AdminInvoiceResponse = {
  id?: number;
  invoiceDate?: string;
  points?: number;
  status?: string;
  storeId?: number;
  storeName?: string;
};

type TransactionResponse = {
  createdAt?: string;
};

type PageResponse<T> = {
  content?: T[];
  totalElements?: number;
};

export async function GET() {
  const token = await getAdminToken();

  if (!token) {
    return NextResponse.json({ message: 'Sessao expirada.' }, { status: 401 });
  }

  try {
    const [
      storesData,
      users,
      invoices,
      pendingInvoices,
      approvedInvoices,
      rejectedInvoices,
      rewards,
      transactions,
    ] = await Promise.all([
      backendRequest<StorePage>(`/api/admin/stores?page=0&size=${SUMMARY_FETCH_SIZE}`, { token }),
      getUsersOrEmpty('/api/admin/users', token),
      getPageOrEmpty<AdminInvoiceResponse>(
        `/api/admin/invoices?page=0&size=${SUMMARY_FETCH_SIZE}&sort=invoiceDate,desc`,
        token,
      ),
      getPageOrEmpty<AdminInvoiceResponse>(
        '/api/admin/invoices?status=PENDING&page=0&size=1',
        token,
      ),
      getPageOrEmpty<AdminInvoiceResponse>(
        '/api/admin/invoices?status=APPROVED&page=0&size=1',
        token,
      ),
      getPageOrEmpty<AdminInvoiceResponse>(
        '/api/admin/invoices?status=REJECTED&page=0&size=1',
        token,
      ),
      getPageOrEmpty<unknown>('/api/admin/loyalty/rewards?page=0&size=1', token),
      getPageOrEmpty<TransactionResponse>(
        `/api/admin/loyalty/transactions?page=0&size=${SUMMARY_FETCH_SIZE}&sort=createdAt,desc`,
        token,
      ),
    ]);
    const stores = Array.isArray(storesData.content) ? storesData.content : [];
    const lojas = stores.map(toLoja);
    const allInvoiceCount = getPageTotal(invoices);
    const loadedStatuses = getLoadedInvoiceStatuses(invoices, allInvoiceCount);
    const approvedCount = loadedStatuses?.approved ?? getPageTotal(approvedInvoices);
    const pendingCount = loadedStatuses?.pending ?? getPageTotal(pendingInvoices);
    const rejectedCount = loadedStatuses?.rejected ?? getPageTotal(rejectedInvoices);
    const summary: DashboardSummary = {
      activeStores: lojas.filter((loja) => loja.estado === 'ATIVA').length,
      pendingInvoices: pendingCount,
      receiptStatus: {
        approved: approvedCount,
        other: Math.max(0, allInvoiceCount - approvedCount - pendingCount - rejectedCount),
        pending: pendingCount,
        rejected: rejectedCount,
        total: allInvoiceCount,
      },
      rewardsTotal: getPageTotal(rewards),
      topStores: getTopStores(invoices.content ?? [], stores),
      usersTotal: users.length,
      volumeByPeriod: createVolumeSeries(transactions.content ?? []),
    };

    return NextResponse.json(summary, {
      headers: {
        'Cache-Control': 'private, max-age=15, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    if (error instanceof BackendApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { message: 'Nao foi possivel carregar o resumo do dashboard.' },
      { status: 500 },
    );
  }
}

async function getPageOrEmpty<T>(path: string, token: string): Promise<PageResponse<T>> {
  try {
    const page = await backendRequest<PageResponse<T>>(path, { token });

    return {
      content: Array.isArray(page.content) ? page.content : [],
      totalElements: page.totalElements ?? page.content?.length ?? 0,
    };
  } catch (error) {
    if (
      error instanceof BackendApiError &&
      (error.status === 401 || error.status === 403 || error.status === 404)
    ) {
      return { content: [], totalElements: 0 };
    }

    throw error;
  }
}

async function getUsersOrEmpty(path: string, token: string) {
  try {
    const users = await backendRequest<UserResponse[]>(path, { token });
    return Array.isArray(users) ? users : [];
  } catch (error) {
    if (
      error instanceof BackendApiError &&
      (error.status === 401 || error.status === 403)
    ) {
      return [];
    }

    throw error;
  }
}

function toLoja(store: StoreResponse): Loja {
  return {
    categoria: store.category,
    createdAt: store.createdAt,
    email: store.email,
    endereco: store.address,
    estado: store.status?.toUpperCase() === 'ACTIVE' ? 'ATIVA' : 'INATIVA',
    id: store.id,
    imageUrl: store.imageUrl,
    nome: store.name,
    piso: store.floor,
    telefone: store.contact,
  };
}

function getPageTotal(page: PageResponse<unknown>) {
  return page.totalElements ?? page.content?.length ?? 0;
}

function getLoadedInvoiceStatuses(
  page: PageResponse<AdminInvoiceResponse>,
  total: number,
) {
  const invoices = page.content ?? [];

  if (invoices.length !== total) {
    return null;
  }

  return invoices.reduce(
    (counts, invoice) => {
      const status = invoice.status?.toUpperCase() ?? '';

      if (['APPROVED', 'CREDITED', 'VALIDATED'].includes(status)) {
        counts.approved += 1;
      } else if (
        ['IN_VALIDATION', 'PENDING', 'PENDING_VALIDATION', 'PROCESSING', 'SUBMITTED'].includes(
          status,
        )
      ) {
        counts.pending += 1;
      } else if (['DECLINED', 'INVALID', 'REJECTED'].includes(status)) {
        counts.rejected += 1;
      }

      return counts;
    },
    { approved: 0, pending: 0, rejected: 0 },
  );
}

function createVolumeSeries(transactions: TransactionResponse[]) {
  const dayMs = 24 * 60 * 60 * 1000;
  const bucketDays = DASHBOARD_PERIOD_DAYS / VOLUME_BUCKETS;
  const today = startOfUtcDay(new Date());
  const periodStart = new Date(today.getTime() - (DASHBOARD_PERIOD_DAYS - 1) * dayMs);
  const buckets = Array.from({ length: VOLUME_BUCKETS }, (_, index) => ({
    label: formatBucketLabel(new Date(periodStart.getTime() + index * bucketDays * dayMs)),
    transactions: 0,
  }));

  transactions.forEach((transaction) => {
    const timestamp = Date.parse(transaction.createdAt ?? '');

    if (!Number.isFinite(timestamp)) {
      return;
    }

    const elapsedDays = Math.floor((timestamp - periodStart.getTime()) / dayMs);
    const bucketIndex = Math.floor(elapsedDays / bucketDays);

    if (bucketIndex >= 0 && bucketIndex < buckets.length) {
      buckets[bucketIndex].transactions += 1;
    }
  });

  return buckets;
}

function getTopStores(invoices: AdminInvoiceResponse[], stores: StoreResponse[]) {
  const storeById = new Map(stores.map((store) => [store.id, store]));
  const activity = new Map<
    string,
    {
      category: string;
      hasPoints: boolean;
      name: string;
      pointsTotal: number;
      receiptCount: number;
      storeId?: number;
    }
  >();

  invoices
    .filter((invoice) => isWithinDashboardPeriod(invoice.invoiceDate))
    .forEach((invoice) => {
      const key = invoice.storeId ? `id:${invoice.storeId}` : `name:${invoice.storeName ?? ''}`;

      if (key === 'name:') {
        return;
      }

      const store = invoice.storeId ? storeById.get(invoice.storeId) : undefined;
      const current = activity.get(key) ?? {
        category: store?.category ?? 'Sem categoria',
        hasPoints: false,
        name: invoice.storeName ?? store?.name ?? 'Loja',
        pointsTotal: 0,
        receiptCount: 0,
        storeId: invoice.storeId,
      };

      current.receiptCount += 1;

      if (typeof invoice.points === 'number' && Number.isFinite(invoice.points)) {
        current.hasPoints = true;
        current.pointsTotal += invoice.points;
      }

      activity.set(key, current);
    });

  return [...activity.values()]
    .sort((left, right) => right.receiptCount - left.receiptCount || left.name.localeCompare(right.name))
    .slice(0, 5)
    .map(({ hasPoints, pointsTotal, ...store }) => ({
      ...store,
      pointsTotal: hasPoints ? pointsTotal : undefined,
    }));
}

function isWithinDashboardPeriod(value?: string) {
  const timestamp = Date.parse(value ?? '');

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const periodStart = Date.now() - DASHBOARD_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  return timestamp >= periodStart;
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatBucketLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-AO', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  })
    .format(date)
    .replace('.', '');
}
