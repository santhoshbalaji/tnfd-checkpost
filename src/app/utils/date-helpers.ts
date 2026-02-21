const IST_OFFSET_MS = 330 * 60000;

const padToTwo = (value: number) => String(value).padStart(2, '0');

function parseDateValue(value?: string | Date): Date | null {
  if (!value) {
    return null;
  }
  const parsed =
    typeof value === 'string'
      ? value.includes('T')
        ? new Date(value)
        : new Date(`${value}T00:00:00`)
      : value;
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

export function toIstDate(value?: string | Date): Date | null {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return null;
  }
  return new Date(parsed.getTime() + IST_OFFSET_MS);
}

export function toIstDateKey(value?: string | Date): string {
  const istDate = toIstDate(value);
  if (!istDate) {
    return '';
  }
  return istDate.toISOString().split('T')[0];
}

export function formatDateForIstInput(date: Date): string {
  const istDate = toIstDate(date);
  if (!istDate) {
    return '';
  }
  return istDate.toISOString().split('T')[0];
}

export function toIstIsoDate(dateKey: string): string {
  if (!dateKey) {
    return '';
  }
  const isoInput = `${dateKey}T00:00:00+05:30`;
  const parsed = new Date(isoInput);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

export function toIstMonthRange(year: number, month: number) {
  if (!year || !month || month < 1 || month > 12) {
    return { startIso: '', endIso: '' };
  }
  const startKey = `${year}-${padToTwo(month)}-01`;
  const nextMonthNumber = month === 12 ? 1 : month + 1;
  const nextMonthYear = month === 12 ? year + 1 : year;
  const endKey = `${nextMonthYear}-${padToTwo(nextMonthNumber)}-01`;
  return {
    startIso: toIstIsoDate(startKey),
    endIso: toIstIsoDate(endKey)
  };
}

export function toIstYearRange(year: number) {
  if (!year) {
    return { startIso: '', endIso: '' };
  }
  const startKey = `${year}-01-01`;
  const endKey = `${year + 1}-01-01`;
  return {
    startIso: toIstIsoDate(startKey),
    endIso: toIstIsoDate(endKey)
  };
}
