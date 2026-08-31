'use client';

import type { IScannerControls } from '@zxing/browser';
import {
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  Keyboard,
  LoaderCircle,
  LogOut,
  QrCode,
  RotateCcw,
  ShieldCheck,
  Store,
  UserRound,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ShoppingLogo } from '@/components/brand/ShoppingLogo';
import type { AdminSession } from '@/lib/admin-session';
import {
  ApiError,
  confirmStorePurchase,
  getPublicLojaLogoPath,
  listAllPublicLojas,
  scanStorePurchase,
} from '@/lib/api';
import type {
  Loja,
  StorePurchaseResponse,
  StorePurchaseScanResponse,
} from '@/lib/api';

import styles from './lojista.module.css';

type FlowStep = 'amount' | 'scan' | 'success';
type CameraState = 'active' | 'denied' | 'idle' | 'starting' | 'unavailable';

type MerchantWorkspaceProps = {
  initialSession: AdminSession;
};

export function MerchantWorkspace({ initialSession }: MerchantWorkspaceProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const requestInFlightRef = useRef(false);
  const [stores, setStores] = useState<Loja[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [storesError, setStoresError] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(
    initialSession.storeId,
  );
  const [step, setStep] = useState<FlowStep>('scan');
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [manualMode, setManualMode] = useState(false);
  const [manualQr, setManualQr] = useState('');
  const [scanResult, setScanResult] = useState<StorePurchaseScanResponse | null>(null);
  const [purchase, setPurchase] = useState<StorePurchaseResponse | null>(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const storageKey = useMemo(
    () => `sf-merchant-store:${initialSession.id ?? initialSession.email ?? 'session'}`,
    [initialSession.email, initialSession.id],
  );
  const selectedStore = useMemo(
    () => stores.find((store) => store.id === selectedStoreId),
    [selectedStoreId, stores],
  );
  const accountLabel = initialSession.nome ?? initialSession.email ?? 'Lojista';

  const stopScanner = useCallback((updateState = true) => {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;

    const video = videoRef.current;
    const stream = video?.srcObject;

    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (video) {
      video.srcObject = null;
    }

    if (updateState) {
      setCameraState('idle');
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadStores() {
      setStoresLoading(true);
      setStoresError(null);

      try {
        const result = await listAllPublicLojas();

        if (!active) {
          return;
        }

        setStores(result);

        if (initialSession.storeId) {
          setSelectedStoreId(initialSession.storeId);
          return;
        }

        const storedId = Number(window.localStorage.getItem(storageKey));
        const rememberedStore = result.find((store) => store.id === storedId);

        if (rememberedStore?.id) {
          setSelectedStoreId(rememberedStore.id);
        } else if (result.length === 1 && result[0].id) {
          setSelectedStoreId(result[0].id);
        }
      } catch (loadError) {
        if (active) {
          setStoresError(getErrorMessage(loadError, 'Nao foi possivel carregar as lojas.'));
        }
      } finally {
        if (active) {
          setStoresLoading(false);
        }
      }
    }

    void loadStores();

    return () => {
      active = false;
    };
  }, [initialSession.storeId, storageKey]);

  useEffect(() => () => stopScanner(false), [stopScanner]);

  async function handleSignOut() {
    stopScanner();
    await fetch('/api/session/logout', { method: 'POST' }).catch(() => undefined);
    router.replace('/login');
    router.refresh();
  }

  function handleStoreChange(value: string) {
    stopScanner();
    const storeId = Number(value);
    const nextStoreId = Number.isSafeInteger(storeId) && storeId > 0 ? storeId : undefined;

    setSelectedStoreId(nextStoreId);
    setError(null);

    if (nextStoreId) {
      window.localStorage.setItem(storageKey, String(nextStoreId));
    } else {
      window.localStorage.removeItem(storageKey);
    }
  }

  async function startScanner() {
    if (!selectedStoreId) {
      setError('Selecione a loja antes de ler o QR do cliente.');
      return;
    }

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraState('unavailable');
      setError('A camara requer uma ligacao HTTPS e um navegador compativel.');
      return;
    }

    stopScanner(false);
    setError(null);
    setManualMode(false);
    setCameraState('starting');

    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const video = videoRef.current;

      if (!video) {
        throw new Error('A pre-visualizacao da camara nao esta disponivel.');
      }

      const reader = new BrowserQRCodeReader(undefined, {
        delayBetweenScanAttempts: 220,
        delayBetweenScanSuccess: 800,
      });
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        video,
        (result, _scanError, activeControls) => {
          if (!result || requestInFlightRef.current) {
            return;
          }

          activeControls.stop();
          scannerControlsRef.current = null;
          setCameraState('idle');
          void processQr(result.getText());
        },
      );

      scannerControlsRef.current = controls;
      setCameraState('active');
    } catch (cameraError) {
      stopScanner(false);
      const denied = isCameraPermissionError(cameraError);
      setCameraState(denied ? 'denied' : 'unavailable');
      setError(
        denied
          ? 'Permita o acesso a camara no navegador para continuar.'
          : getErrorMessage(cameraError, 'Nao foi possivel abrir a camara.'),
      );
    }
  }

  async function processQr(qrContent: string) {
    const normalizedQr = qrContent.trim();

    if (!selectedStoreId) {
      setError('Selecione a loja antes de validar o cliente.');
      return;
    }

    if (!normalizedQr) {
      setError('Insira um codigo QR valido.');
      return;
    }

    if (requestInFlightRef.current) {
      return;
    }

    requestInFlightRef.current = true;
    stopScanner();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await scanStorePurchase({
        qrContent: normalizedQr,
        storeId: selectedStoreId,
      });

      if (!result.purchaseId) {
        throw new Error('A API nao devolveu o identificador da compra.');
      }

      setScanResult(result);
      setManualQr('');
      setManualMode(false);
      setStep('amount');
    } catch (scanError) {
      await handleSessionError(scanError);
      setError(getErrorMessage(scanError, 'Nao foi possivel validar o QR do cliente.'));
    } finally {
      requestInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }

  function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void processQr(manualQr);
  }

  async function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!scanResult?.purchaseId) {
      setError('Leia novamente o QR do cliente.');
      setStep('scan');
      return;
    }

    const parsedAmount = parseAmount(amount);

    if (parsedAmount === null || parsedAmount < 0.01) {
      setError('Insira um valor de compra valido.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await confirmStorePurchase(scanResult.purchaseId, parsedAmount);
      setPurchase(result);
      setStep('success');
    } catch (confirmError) {
      await handleSessionError(confirmError);
      setError(getErrorMessage(confirmError, 'Nao foi possivel confirmar a compra.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetFlow() {
    stopScanner();
    setStep('scan');
    setScanResult(null);
    setPurchase(null);
    setAmount('');
    setManualQr('');
    setManualMode(false);
    setError(null);
  }

  function returnToScanner() {
    setStep('scan');
    setScanResult(null);
    setAmount('');
    setError(null);
  }

  async function handleSessionError(apiError: unknown) {
    if (!(apiError instanceof ApiError) || apiError.status !== 401) {
      return;
    }

    await fetch('/api/session/logout', { method: 'POST' }).catch(() => undefined);
    router.replace('/login');
    router.refresh();
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <ShoppingLogo size="sm" />
          </div>

          <div className={styles.account}>
            <span className={styles.accountIcon} aria-hidden>
              <UserRound size={17} strokeWidth={1.7} />
            </span>
            <span className={styles.accountCopy}>
              <strong>{accountLabel}</strong>
              <span>Lojista</span>
            </span>
            <button
              aria-label="Terminar sessão"
              className={styles.iconButton}
              onClick={() => void handleSignOut()}
              title="Sair"
              type="button"
            >
              <LogOut aria-hidden size={18} strokeWidth={1.7} />
            </button>
          </div>
        </div>
      </header>

      <section className={styles.content}>
        <div className={styles.headingRow}>
          <div className={styles.heading}>
            <span className={styles.eyebrow}>Área do lojista</span>
            <h1>Registar compra</h1>
          </div>

          <label className={styles.storeField}>
            <span>Loja</span>
            <span className={styles.selectShell}>
              <Store aria-hidden size={17} strokeWidth={1.7} />
              <select
                aria-label="Loja da compra"
                disabled={
                  Boolean(initialSession.storeId) ||
                  storesLoading ||
                  isSubmitting ||
                  cameraState === 'active' ||
                  cameraState === 'starting' ||
                  step !== 'scan'
                }
                onChange={(event) => handleStoreChange(event.target.value)}
                value={selectedStoreId ?? ''}
              >
                <option value="">
                  {storesLoading ? 'A carregar lojas...' : 'Selecionar loja'}
                </option>
                {stores.map((store) => (
                  <option key={store.id ?? store.nome} value={store.id}>
                    {store.nome ?? `Loja ${store.id}`}
                  </option>
                ))}
                {initialSession.storeId && !selectedStore ? (
                  <option value={initialSession.storeId}>
                    Loja #{initialSession.storeId}
                  </option>
                ) : null}
              </select>
            </span>
          </label>
        </div>

        <ol className={styles.steps} aria-label="Progresso do registo da compra">
          <ProgressStep active={step === 'scan'} complete={step !== 'scan'} index={1} label="Cliente" />
          <ProgressStep active={step === 'amount'} complete={step === 'success'} index={2} label="Compra" />
          <ProgressStep active={step === 'success'} complete={false} index={3} label="Concluído" />
        </ol>

        {storesError ? (
          <p className={styles.inlineError} role="alert">
            {storesError}
          </p>
        ) : null}

        <section className={styles.workspace} aria-live="polite">
          {step === 'scan' ? (
            <>
              <div className={styles.scannerColumn}>
                <div className={styles.sectionTitle}>
                  <QrCode aria-hidden size={21} strokeWidth={1.7} />
                  <div>
                    <h2>QR do cliente</h2>
                    <span>{getCameraStatus(cameraState, isSubmitting)}</span>
                  </div>
                </div>

                <div className={styles.cameraFrame} data-state={cameraState}>
                  <video
                    aria-label="Pré-visualização da câmara"
                    autoPlay
                    className={styles.video}
                    muted
                    playsInline
                    ref={videoRef}
                  />

                  {cameraState !== 'active' ? (
                    <div className={styles.cameraEmpty}>
                      {isSubmitting || cameraState === 'starting' ? (
                        <LoaderCircle aria-hidden className={styles.spinner} size={34} />
                      ) : cameraState === 'denied' || cameraState === 'unavailable' ? (
                        <Camera aria-hidden size={36} strokeWidth={1.4} />
                      ) : (
                        <QrCode aria-hidden size={42} strokeWidth={1.35} />
                      )}
                    </div>
                  ) : null}

                  {cameraState === 'active' ? <span className={styles.scanTarget} aria-hidden /> : null}
                </div>

                <div className={styles.scannerActions}>
                  {cameraState === 'active' || cameraState === 'starting' ? (
                    <button
                      className={styles.secondaryButton}
                      onClick={() => stopScanner()}
                      type="button"
                    >
                      <X aria-hidden size={17} strokeWidth={1.8} />
                      Fechar câmara
                    </button>
                  ) : (
                    <button
                      className={styles.primaryButton}
                      disabled={isSubmitting || storesLoading}
                      onClick={() => void startScanner()}
                      type="button"
                    >
                      <Camera aria-hidden size={18} strokeWidth={1.8} />
                      Abrir câmara
                    </button>
                  )}

                  <button
                    className={styles.textButton}
                    disabled={isSubmitting}
                    onClick={() => {
                      stopScanner();
                      setManualMode((current) => !current);
                      setError(null);
                    }}
                    type="button"
                  >
                    <Keyboard aria-hidden size={17} strokeWidth={1.7} />
                    Inserir código
                  </button>
                </div>
              </div>

              <aside className={styles.detailsColumn}>
                <div className={styles.storeSummary}>
                  <MerchantStoreLogo
                    key={selectedStoreId ?? 'no-store'}
                    store={selectedStore}
                    storeId={selectedStoreId}
                  />
                  <div>
                    <span>Loja da compra</span>
                    <strong>{selectedStore?.nome ?? (selectedStoreId ? `Loja #${selectedStoreId}` : 'Por selecionar')}</strong>
                  </div>
                </div>

                {manualMode ? (
                  <form className={styles.manualForm} onSubmit={handleManualSubmit}>
                    <label htmlFor="manual-qr">Código do QR</label>
                    <textarea
                      autoComplete="off"
                      id="manual-qr"
                      onChange={(event) => setManualQr(event.target.value)}
                      placeholder="Cole o código do cliente"
                      rows={4}
                      spellCheck={false}
                      value={manualQr}
                    />
                    <button
                      className={styles.primaryButton}
                      disabled={isSubmitting || !manualQr.trim()}
                      type="submit"
                    >
                      {isSubmitting ? (
                        <LoaderCircle aria-hidden className={styles.spinner} size={18} />
                      ) : (
                        <ShieldCheck aria-hidden size={18} strokeWidth={1.8} />
                      )}
                      Validar cliente
                    </button>
                  </form>
                ) : (
                  <div className={styles.statusList}>
                    <StatusRow complete={Boolean(selectedStoreId)} label="Loja selecionada" />
                    <StatusRow complete={cameraState === 'active'} label="Câmara ativa" />
                    <StatusRow complete={false} label="Cliente validado" />
                  </div>
                )}

                {error ? <ErrorMessage message={error} /> : null}
              </aside>
            </>
          ) : null}

          {step === 'amount' && scanResult ? (
            <>
              <div className={styles.customerColumn}>
                <button className={styles.backButton} onClick={returnToScanner} type="button">
                  <ChevronLeft aria-hidden size={18} strokeWidth={1.8} />
                  Voltar
                </button>

                <div className={styles.customerIdentity}>
                  <span className={styles.customerAvatar} aria-hidden>
                    {getInitials(scanResult.customerName)}
                  </span>
                  <div>
                    <span>Cliente validado</span>
                    <h2>{scanResult.customerName ?? `Cliente #${scanResult.customerId ?? ''}`}</h2>
                    {scanResult.expiresAt ? (
                      <p>Válido até {formatTime(scanResult.expiresAt)}</p>
                    ) : null}
                  </div>
                  <CheckCircle2 aria-label="QR validado" className={styles.validIcon} size={30} />
                </div>

                <dl className={styles.purchaseDetails}>
                  <div>
                    <dt>Loja</dt>
                    <dd>{scanResult.storeName ?? selectedStore?.nome ?? `Loja #${selectedStoreId}`}</dd>
                  </div>
                  <div>
                    <dt>Estado</dt>
                    <dd>{formatStatus(scanResult.status)}</dd>
                  </div>
                </dl>
              </div>

              <div className={styles.amountColumn}>
                <div className={styles.sectionTitle}>
                  <CircleDollarSign aria-hidden size={22} strokeWidth={1.7} />
                  <div>
                    <h2>Valor da compra</h2>
                    <span>Montante em kwanzas</span>
                  </div>
                </div>

                <form className={styles.amountForm} onSubmit={handleConfirm}>
                  <label htmlFor="purchase-amount">Total</label>
                  <div className={styles.amountInput}>
                    <span>Kz</span>
                    <input
                      autoFocus
                      id="purchase-amount"
                      inputMode="decimal"
                      min="0.01"
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder="0,00"
                      required
                      step="0.01"
                      type="number"
                      value={amount}
                    />
                  </div>

                  {error ? <ErrorMessage message={error} /> : null}

                  <button
                    className={styles.primaryButton}
                    disabled={isSubmitting || !amount}
                    type="submit"
                  >
                    {isSubmitting ? (
                      <LoaderCircle aria-hidden className={styles.spinner} size={18} />
                    ) : (
                      <Check aria-hidden size={18} strokeWidth={1.9} />
                    )}
                    Confirmar compra
                  </button>
                </form>
              </div>
            </>
          ) : null}

          {step === 'success' && purchase ? (
            <div className={styles.successPanel}>
              <span className={styles.successIcon} aria-hidden>
                <Check size={38} strokeWidth={2.2} />
              </span>
              <div className={styles.successCopy}>
                <span>Compra registada</span>
                <h2>{formatPoints(purchase.points)}</h2>
                <p>{purchase.customerName ?? scanResult?.customerName ?? 'Cliente'}</p>
              </div>

              <dl className={styles.successDetails}>
                <div>
                  <dt>Valor</dt>
                  <dd>{formatCurrency(purchase.amount ?? parseAmount(amount) ?? 0)}</dd>
                </div>
                <div>
                  <dt>Loja</dt>
                  <dd>{purchase.storeName ?? selectedStore?.nome ?? `Loja #${selectedStoreId}`}</dd>
                </div>
              </dl>

              <button className={styles.primaryButton} onClick={resetFlow} type="button">
                <RotateCcw aria-hidden size={18} strokeWidth={1.8} />
                Nova compra
              </button>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}

function ProgressStep({
  active,
  complete,
  index,
  label,
}: {
  active: boolean;
  complete: boolean;
  index: number;
  label: string;
}) {
  const className = active
    ? `${styles.step} ${styles.stepActive}`
    : complete
      ? `${styles.step} ${styles.stepComplete}`
      : styles.step;

  return (
    <li aria-current={active ? 'step' : undefined} className={className}>
      <span>{complete ? <Check aria-hidden size={14} strokeWidth={2.1} /> : index}</span>
      <strong>{label}</strong>
    </li>
  );
}

function StatusRow({ complete, label }: { complete: boolean; label: string }) {
  return (
    <div className={complete ? `${styles.statusRow} ${styles.statusComplete}` : styles.statusRow}>
      <span aria-hidden>{complete ? <Check size={13} strokeWidth={2.2} /> : null}</span>
      <strong>{label}</strong>
    </div>
  );
}

function MerchantStoreLogo({ store, storeId }: { store?: Loja; storeId?: number }) {
  const [failed, setFailed] = useState(false);
  const id = store?.id ?? storeId;
  const src = id ? getPublicLojaLogoPath(id) : null;

  return (
    <span className={styles.storeLogo}>
      {src && !failed ? (
        <Image
          alt={`Logotipo da loja ${store?.nome ?? id}`}
          fill
          onError={() => setFailed(true)}
          sizes="52px"
          src={src}
          unoptimized
        />
      ) : (
        <Store aria-hidden size={22} strokeWidth={1.6} />
      )}
    </span>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className={styles.errorMessage} role="alert">
      <X aria-hidden size={16} strokeWidth={2} />
      {message}
    </p>
  );
}

function getCameraStatus(cameraState: CameraState, isSubmitting: boolean) {
  if (isSubmitting) {
    return 'A validar cliente';
  }

  if (cameraState === 'active') {
    return 'Câmara ativa';
  }

  if (cameraState === 'starting') {
    return 'A abrir câmara';
  }

  if (cameraState === 'denied') {
    return 'Acesso à câmara bloqueado';
  }

  if (cameraState === 'unavailable') {
    return 'Câmara indisponível';
  }

  return 'Pronto para leitura';
}

function isCameraPermissionError(error: unknown) {
  return error instanceof DOMException &&
    (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError');
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

function parseAmount(value: string) {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-AO', {
    currency: 'AOA',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(value);
}

function formatPoints(points?: number) {
  const value = points ?? 0;
  return `${value >= 0 ? '+' : ''}${new Intl.NumberFormat('pt-AO').format(value)} pts`;
}

function formatTime(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('pt-AO', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
}

function formatStatus(status?: string) {
  const normalized = status?.trim().toUpperCase();

  if (normalized === 'PENDING' || normalized === 'PENDENTE') {
    return 'Pendente';
  }

  if (normalized === 'CONFIRMED' || normalized === 'CONFIRMADA') {
    return 'Confirmada';
  }

  return status ?? 'QR validado';
}

function getInitials(name?: string) {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];

  if (!words.length) {
    return 'SF';
  }

  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('');
}
