/**
 * Префикс направления до первой цифры: «П-2-23» → «П», «ИСиП-8-22» → «ИСиП».
 * Должен совпадать с backend/src/utils/groupIndex.ts.
 */
export function groupIndexFromGroupName(groupName: string): string {
  const trimmed = groupName.trim();
  if (!trimmed) return '';
  const m = trimmed.match(/^[^\d]+/u);
  if (!m) return '';
  return m[0].replace(/[-\s]+$/u, '').trim();
}

export type GroupIndexFields = { groupName: string; groupIndex: string };

export function effectiveGroupIndex(g: GroupIndexFields): string {
  const stored = g.groupIndex?.trim();
  if (stored) return stored;
  return groupIndexFromGroupName(g.groupName);
}

/** Уникальные индексы групп, отсортированные по-русски. */
export function uniqueSortedGroupIndices(groups: GroupIndexFields[]): string[] {
  const s = new Set<string>();
  for (const g of groups) {
    const v = effectiveGroupIndex(g);
    if (v) s.add(v);
  }
  return [...s].sort((a, b) => a.localeCompare(b, 'ru'));
}

/** Если index пустой — все группы; иначе только с данным индексом. */
export function groupsMatchingIndex<T extends GroupIndexFields>(groups: T[], index: string): T[] {
  const t = index.trim();
  if (!t) return groups;
  return groups.filter((g) => effectiveGroupIndex(g) === t);
}
