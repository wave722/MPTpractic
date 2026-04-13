/**
 * Префикс направления до первой цифры: «П-2-23» → «П», «ВД-7-23» → «ВД», «ИСиП-8-22» → «ИСиП».
 * Хвостовые дефисы/пробелы после префикса убираются.
 */
export function groupIndexFromGroupName(groupName: string): string {
  const trimmed = groupName.trim();
  if (!trimmed) return '';
  const m = trimmed.match(/^[^\d]+/u);
  if (!m) return '';
  return m[0].replace(/[-\s]+$/u, '').trim();
}

export type GroupIndexFields = { groupName: string; groupIndex: string };

/** Сохранённый индекс из БД или разбор из названия, если поле пустое. */
export function effectiveGroupIndex(g: GroupIndexFields): string {
  const stored = g.groupIndex?.trim();
  if (stored) return stored;
  return groupIndexFromGroupName(g.groupName);
}
