import prisma from './prisma';

export async function loadGroupIndexLabelMap(): Promise<Map<string, string>> {
  const rows = await prisma.groupIndexLabel.findMany();
  const m = new Map<string, string>();
  for (const r of rows) {
    const k = r.indexKey.trim();
    if (k) m.set(k, r.exportLabel.trim());
  }
  return m;
}

export function exportLabelFromMap(map: Map<string, string>, index: string): string {
  const t = index.trim();
  if (!t) return '—';
  return map.get(t) ?? t;
}

export function specialtiesLineFromMap(map: Map<string, string>, indices: string[]): string {
  const uniq = [...new Set(indices.map((s) => s.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'ru')
  );
  if (uniq.length === 0) {
    return 'Специальности (справочник кодов): —';
  }
  return `Специальности (справочник кодов): ${uniq.map((i) => exportLabelFromMap(map, i)).join(', ')}`;
}
