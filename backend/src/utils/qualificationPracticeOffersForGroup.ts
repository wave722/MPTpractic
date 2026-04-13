import prisma from './prisma';
import { effectiveGroupIndex } from './groupIndex';
import { formatDateToYmdLocal } from './dateInput';

export type StudentPracticeOfferDto = {
  id: number;
  periodStart: string;
  periodEnd: string;
  note: string;
  practice: {
    id: number;
    practiceIndex: string;
    practiceName: string;
    moduleIndex: string;
    moduleName: string;
  };
};

export async function getPracticeOffersPayloadForGroupId(groupId: number): Promise<{
  qualificationLabel: string | null;
  indexKey: string;
  offers: StudentPracticeOfferDto[];
}> {
  const g = await prisma.group.findUnique({ where: { id: groupId } });
  if (!g) {
    return { qualificationLabel: null, indexKey: '', offers: [] };
  }
  const idx = effectiveGroupIndex(g);
  const label = await prisma.groupIndexLabel.findUnique({ where: { indexKey: idx } });
  if (!label) {
    return { qualificationLabel: null, indexKey: idx, offers: [] };
  }
  const rows = await prisma.qualificationPracticeOffer.findMany({
    where: { groupIndexLabelId: label.id },
    include: { practice: { include: { module: true } } },
    orderBy: { periodStart: 'asc' },
  });
  return {
    qualificationLabel: label.exportLabel,
    indexKey: idx,
    offers: rows.map((o) => ({
      id: o.id,
      periodStart: formatDateToYmdLocal(o.periodStart),
      periodEnd: formatDateToYmdLocal(o.periodEnd),
      note: o.note,
      practice: {
        id: o.practice.id,
        practiceIndex: o.practice.practiceIndex,
        practiceName: o.practice.practiceName,
        moduleIndex: o.practice.module.moduleIndex,
        moduleName: o.practice.module.moduleName,
      },
    })),
  };
}
