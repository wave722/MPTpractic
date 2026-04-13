import type { StudentProfile } from '@prisma/client';

/** Поля анкеты, обязательные для отправки на проверку. */
export type StudentProfileCompletenessFields = Pick<
  StudentProfile,
  | 'fio'
  | 'groupId'
  | 'phone'
  | 'placementOrgName'
  | 'placementOrgAddress'
  | 'placementOrgEmail'
  | 'placementOrgPhone'
  | 'placementOrgHeadFio'
  | 'placementOrgHeadPosition'
  | 'placementPracticeRespFio'
  | 'placementPracticeRespPosition'
  | 'placementPracticeRespPhone'
  | 'placementMetroMin'
  | 'placementPeriodStart'
  | 'placementPeriodEnd'
  | 'placementModuleIndex'
  | 'placementModuleName'
  | 'placementPracticeIndex'
  | 'placementPracticeName'
  | 'placementTechSupervisorFio'
  | 'placementTechSupervisorPosition'
  | 'placementTechSupervisorPhone'
  | 'placementOrgSupervisorFio'
>;

function strOk(v: string | null | undefined): boolean {
  return Boolean(v?.trim());
}

export function isStudentProfileComplete(p: StudentProfileCompletenessFields): boolean {
  if (!strOk(p.fio) || p.groupId == null || !strOk(p.phone)) return false;

  if (
    !strOk(p.placementOrgName) ||
    !strOk(p.placementOrgAddress) ||
    !strOk(p.placementOrgEmail) ||
    !strOk(p.placementOrgPhone) ||
    !strOk(p.placementOrgHeadFio) ||
    !strOk(p.placementOrgHeadPosition) ||
    !strOk(p.placementPracticeRespFio) ||
    !strOk(p.placementPracticeRespPosition) ||
    !strOk(p.placementPracticeRespPhone) ||
    !strOk(p.placementModuleIndex) ||
    !strOk(p.placementModuleName) ||
    !strOk(p.placementPracticeIndex) ||
    !strOk(p.placementPracticeName) ||
    !strOk(p.placementTechSupervisorFio) ||
    !strOk(p.placementTechSupervisorPosition) ||
    !strOk(p.placementTechSupervisorPhone) ||
    !strOk(p.placementOrgSupervisorFio)
  ) {
    return false;
  }

  if (!p.placementPeriodStart || !p.placementPeriodEnd) return false;
  if (p.placementPeriodEnd < p.placementPeriodStart) return false;

  if (p.placementMetroMin != null) {
    if (p.placementMetroMin < 1 || p.placementMetroMin > 180) return false;
  }

  return true;
}

export function canStudentEditProfile(status: string): boolean {
  return status === 'DRAFT' || status === 'REJECTED';
}

export function canStudentSubmitForReview(status: string, complete: boolean): boolean {
  if (!complete) return false;
  return status === 'DRAFT' || status === 'REJECTED';
}
