/** Парсинг и форматирование дат из полей type=date без сдвига часового пояса. */
export function parseDateInputYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function formatDateToYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
