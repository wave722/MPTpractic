import type { StudentProfileMe, StudentProfileUpdatePayload } from '@/types';

/** Поля формы анкеты (все строки для controlled inputs). */
export type StudentAnketaFormValues = {
  fio: string;
  groupId: string;
  organizationId: string;
  phone: string;
  placementOrgName: string;
  placementOrgAddress: string;
  placementOrgEmail: string;
  placementOrgPhone: string;
  placementOrgHeadFio: string;
  placementOrgHeadPosition: string;
  placementPracticeRespFio: string;
  placementPracticeRespPosition: string;
  placementPracticeRespPhone: string;
  placementMetroMin: string;
  placementPeriodStart: string;
  placementPeriodEnd: string;
  placementModuleIndex: string;
  placementModuleName: string;
  placementPracticeIndex: string;
  placementPracticeName: string;
  placementTechSupervisorFio: string;
  placementTechSupervisorPosition: string;
  placementTechSupervisorPhone: string;
  placementOrgSupervisorFio: string;
};

export function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function localNoonFromYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function profileToFormDefaults(p: StudentProfileMe): StudentAnketaFormValues {
  return {
    fio: p.fio ?? '',
    groupId: p.groupId != null ? String(p.groupId) : '',
    organizationId: p.organizationId != null ? String(p.organizationId) : '',
    phone: p.phone ?? '',
    placementOrgName: p.placementOrgName ?? '',
    placementOrgAddress: p.placementOrgAddress ?? '',
    placementOrgEmail: p.placementOrgEmail ?? '',
    placementOrgPhone: p.placementOrgPhone ?? '',
    placementOrgHeadFio: p.placementOrgHeadFio ?? '',
    placementOrgHeadPosition: p.placementOrgHeadPosition ?? '',
    placementPracticeRespFio: p.placementPracticeRespFio ?? '',
    placementPracticeRespPosition: p.placementPracticeRespPosition ?? '',
    placementPracticeRespPhone: p.placementPracticeRespPhone ?? '',
    placementMetroMin: p.placementMetroMin != null ? String(p.placementMetroMin) : '',
    placementPeriodStart: toDateInput(p.placementPeriodStart),
    placementPeriodEnd: toDateInput(p.placementPeriodEnd),
    placementModuleIndex: p.placementModuleIndex ?? '',
    placementModuleName: p.placementModuleName ?? '',
    placementPracticeIndex: p.placementPracticeIndex ?? '',
    placementPracticeName: p.placementPracticeName ?? '',
    placementTechSupervisorFio: p.placementTechSupervisorFio ?? '',
    placementTechSupervisorPosition: p.placementTechSupervisorPosition ?? '',
    placementTechSupervisorPhone: p.placementTechSupervisorPhone ?? '',
    placementOrgSupervisorFio: p.placementOrgSupervisorFio ?? '',
  };
}

export function formValuesToPayload(v: StudentAnketaFormValues): StudentProfileUpdatePayload {
  const start = localNoonFromYmd(v.placementPeriodStart);
  const end = localNoonFromYmd(v.placementPeriodEnd);
  return {
    fio: v.fio.trim(),
    groupId: Number(v.groupId),
    phone: v.phone.trim(),
    organizationId: v.organizationId ? Number(v.organizationId) : null,
    placementOrgName: v.placementOrgName.trim(),
    placementOrgAddress: v.placementOrgAddress.trim(),
    placementOrgEmail: v.placementOrgEmail.trim().toLowerCase(),
    placementOrgPhone: v.placementOrgPhone.trim(),
    placementOrgHeadFio: v.placementOrgHeadFio.trim(),
    placementOrgHeadPosition: v.placementOrgHeadPosition.trim(),
    placementPracticeRespFio: v.placementPracticeRespFio.trim(),
    placementPracticeRespPosition: v.placementPracticeRespPosition.trim(),
    placementPracticeRespPhone: v.placementPracticeRespPhone.trim(),
    placementMetroMin: v.placementMetroMin ? Number(v.placementMetroMin) : null,
    placementPeriodStart: start.toISOString(),
    placementPeriodEnd: end.toISOString(),
    placementModuleIndex: v.placementModuleIndex.trim(),
    placementModuleName: v.placementModuleName.trim(),
    placementPracticeIndex: v.placementPracticeIndex.trim(),
    placementPracticeName: v.placementPracticeName.trim(),
    placementTechSupervisorFio: v.placementTechSupervisorFio.trim(),
    placementTechSupervisorPosition: v.placementTechSupervisorPosition.trim(),
    placementTechSupervisorPhone: v.placementTechSupervisorPhone.trim(),
    placementOrgSupervisorFio: v.placementOrgSupervisorFio.trim(),
  };
}
