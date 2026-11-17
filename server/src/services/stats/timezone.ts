export function createDayFormatter(tz: string): Intl.DateTimeFormat {
  if (typeof tz !== 'string' || tz.trim().length === 0) {
    throw new Error('Timezone must be a non-empty IANA timezone string');
  }

  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    throw new Error(`Invalid IANA timezone: "${tz}"`);
  }
}

export function isValidTimeZone(tz: string): boolean {
  try {
    createDayFormatter(tz);
    return true;
  } catch {
    return false;
  }
}

export function toValidDate(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: "${String(value)}"`);
  }
  return date;
}

export function subtractCalendarDays(yyyyMmDd: string, days: number): string {
  const [year, month, day] = yyyyMmDd.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day - days));
  return shifted.toISOString().slice(0, 10);
}
