export function formatAdminDate(value?: string, time = false) {
  if (!value || Number.isNaN(Date.parse(value))) return 'Não disponível';
  return new Intl.DateTimeFormat('pt-PT', {
    dateStyle: 'medium',
    ...(time ? { timeStyle: 'short' as const } : {}),
    timeZone: 'Africa/Luanda',
  }).format(new Date(value));
}

export function formatNumber(value?: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat('pt-PT').format(value)
    : 'Não disponível';
}

export function buildCsv(rows: unknown[][]) {
  return (
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((value) => {
            let text = String(value ?? '');
            // Spreadsheet applications must not interpret user-provided cells as formulas.
            if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
            return `"${text.replaceAll('"', '""')}"`;
          })
          .join(';'),
      )
      .join('\r\n')
  );
}

export function downloadCsv(name: string, rows: unknown[][]) {
  const url = URL.createObjectURL(
    new Blob([buildCsv(rows)], { type: 'text/csv;charset=utf-8' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function matchesDateRange(
  value: string | undefined,
  from: string,
  to: string,
) {
  if (!from && !to) return true;
  if (!value || Number.isNaN(Date.parse(value))) return false;
  const time = Date.parse(value);
  return (
    (!from || time >= Date.parse(`${from}T00:00:00+01:00`)) &&
    (!to || time <= Date.parse(`${to}T23:59:59.999+01:00`))
  );
}

export function rewardAvailability(stock?: number) {
  return typeof stock !== 'number' || !Number.isFinite(stock) || stock < 0
    ? 'unknown'
    : stock === 0
      ? 'empty'
      : 'available';
}

export function validateSchedule(date: string, time: string, now = Date.now()) {
  const timestamp = Date.parse(`${date}T${time}:00+01:00`);
  return Number.isFinite(timestamp) && timestamp > now;
}
