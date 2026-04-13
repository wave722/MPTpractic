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
