/** Подпись по справочнику индексов; без записи — сам индекс. */
export function exportLabelForIndex(
  labels: { indexKey: string; exportLabel: string }[],
  index: string
): string {
  const t = index.trim();
  if (!t) return '—';
  const row = labels.find((l) => l.indexKey === t);
  return row?.exportLabel ?? t;
}

/** Ключи индексов из справочника администратора (для фильтров, без «фантомов» из названий групп). */
export function sortedAdminGroupIndexKeys(labels: { indexKey: string }[]): string[] {
  return [...new Set(labels.map((l) => l.indexKey.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'ru')
  );
}
