import { NextResponse } from 'next/server';

import type { StorePurchaseResponse } from '@/lib/api';
import { backendRequest } from '@/lib/server-backend';
import {
  getMerchantContext,
  isSameOriginRequest,
  MerchantAccessError,
  merchantErrorResponse,
} from '@/lib/server-merchant';

type ConfirmBody = {
  amount?: unknown;
};

type ConfirmContext = {
  params: Promise<{
    purchaseId: string;
  }>;
};

export async function POST(request: Request, context: ConfirmContext) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: 'Origem do pedido invalida.' }, { status: 403 });
  }

  try {
    const { session, token } = await getMerchantContext();
    const { purchaseId } = await context.params;
    const body = (await request.json()) as ConfirmBody;
    const amount = typeof body.amount === 'number' ? body.amount : Number(body.amount);

    if (!purchaseId || !Number.isFinite(amount) || amount < 0.01) {
      return NextResponse.json(
        { message: 'O valor da compra e invalido.' },
        { status: 400 },
      );
    }

    const result = await backendRequest<StorePurchaseResponse>(
      `/api/store/purchases/${encodeURIComponent(purchaseId)}/confirm`,
      {
        body: { amount },
        method: 'POST',
        token,
      },
    );

    if (result.storeId !== undefined && Number(result.storeId) !== session.storeId) {
      throw new MerchantAccessError(
        'A API confirmou a compra para uma loja diferente da conta do lojista.',
        403,
      );
    }

    return NextResponse.json({
      ...result,
      storeId: session.storeId,
    });
  } catch (error) {
    return merchantErrorResponse(error);
  }
}
