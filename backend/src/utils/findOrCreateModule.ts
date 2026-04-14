import prisma from './prisma';

/** Модуль по индексу: существующий или новый (для привязки практики без выбора из списка). */
export async function findOrCreateModuleByIndex(
  moduleIndex: string,
  moduleName: string
): Promise<{ id: number }> {
  const idx = moduleIndex.trim();
  const name = moduleName.trim();
  if (!idx || !name) {
    throw new Error('module_index_and_name_required');
  }
  const existing = await prisma.module.findUnique({ where: { moduleIndex: idx } });
  if (existing) {
    return { id: existing.id };
  }
  const created = await prisma.module.create({
    data: { moduleIndex: idx, moduleName: name },
  });
  return { id: created.id };
}
