import { NextResponse } from 'next/server';

import type { StorePurchaseScanResponse } from '@/lib/api';
import { backendRequest } from '@/lib/server-backend';
import {
  getMerchantContext,
  isSameOriginRequest,
  MerchantAccessError,
  merchantErrorResponse,
} from '@/lib/server-merchant';

type ScanBody = {
  qrContent?: unknown;
};

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: 'Origem do pedido invalida.' }, { status: 403 });
  }

  try {
    const { session, token } = await getMerchantContext();
    const body = (await request.json()) as ScanBody;
    const qrContent = typeof body.qrContent === 'string' ? body.qrContent.trim() : '';

    if (!qrContent) {
      return NextResponse.json({ message: 'O codigo QR e obrigatorio.' }, { status: 400 });
    }

    const result = await backendRequest<StorePurchaseScanResponse>(
      '/api/store/purchases/scan',
      {
        body: {
          qrContent,
          storeId: session.storeId,
        },
        method: 'POST',
        token,
      },
    );

    assertAssignedStore(result.storeId, session.storeId);

    return NextResponse.json({
      ...result,
      storeId: session.storeId,
    });
  } catch (error) {
    return merchantErrorResponse(error);
  }
}

function assertAssignedStore(responseStoreId: number | undefined, assignedStoreId: number) {
  if (responseStoreId !== undefined && Number(responseStoreId) !== assignedStoreId) {
    throw new MerchantAccessError(
      'A API associou a compra a uma loja diferente da conta do lojista.',
      403,
    );
  }
}
