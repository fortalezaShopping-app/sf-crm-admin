import { NextResponse } from 'next/server';

import type {
  DashboardSummary,
  Loja,
} from '@/lib/api';
import { backendRequest, BackendApiError } from '@/lib/server-backend';
import { getAdminToken } from '@/lib/server-auth';

const SUMMARY_FETCH_SIZE = 1000;

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

export async function GET() {
  const token = await getAdminToken();

  if (!token) {
    return NextResponse.json({ message: 'Sessao expirada.' }, { status: 401 });
  }

  try {
    const [storesData, customersResult, usersResult] = await Promise.all([
      backendRequest<StorePage>(`/api/admin/stores?page=0&size=${SUMMARY_FETCH_SIZE}`, { token }),
      getUsersOrEmpty('/api/admin/users?role=CUSTOMER', token),
      getUsersOrEmpty('/api/admin/users', token),
    ]);
    const stores = Array.isArray(storesData.content) ? storesData.content : [];
    const customers = customersResult;
    const users = usersResult;
    const lojas = stores.map(toLoja);
    const summary: DashboardSummary = {
      clientesTotal: customers.length,
      lojasAtivas: lojas.filter((loja) => loja.estado === 'ATIVA').length,
      lojasComImagem: stores.filter((store) => Boolean(store.imageUrl)).length,
      lojasRecentes: [...lojas]
        .sort((left, right) => compareDates(right.createdAt, left.createdAt))
        .slice(0, 5),
      lojasTotal: storesData.totalElements ?? lojas.length,
      utilizadoresInternosTotal: Math.max(0, users.length - customers.length),
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

function compareDates(left?: string, right?: string) {
  return new Date(left ?? 0).getTime() - new Date(right ?? 0).getTime();
}
