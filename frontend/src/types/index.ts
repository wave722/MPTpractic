export type Role = 'ADMIN' | 'METHODIST' | 'OBSERVER' | 'STUDENT';

export type ProfileReviewStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export interface StudentAccess {
  reviewStatus: ProfileReviewStatus;
  isProfileComplete: boolean;
  rejectionReason: string | null;
  canAccessAssignments: boolean;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
}

export interface MeResponse extends User {
  techSupervisorId?: number | null;
  studentAccess?: StudentAccess | null;
}

export interface GroupLookup {
  id: number;
  groupName: string;
  groupIndex: string;
}

export interface OrganizationLookup {
  id: number;
  name: string;
  address: string;
}

/** Поля места практики в анкете (как в ответе API). */
export interface StudentPlacementFields {
  placementOrgName: string | null;
  placementOrgAddress: string | null;
  placementOrgEmail: string | null;
  placementOrgPhone: string | null;
  placementOrgHeadFio: string | null;
  placementOrgHeadPosition: string | null;
  placementPracticeRespFio: string | null;
  placementPracticeRespPosition: string | null;
  placementPracticeRespPhone: string | null;
  placementMetroMin: number | null;
  placementPeriodStart: string | null;
  placementPeriodEnd: string | null;
  placementModuleIndex: string | null;
  placementModuleName: string | null;
  placementPracticeIndex: string | null;
  placementPracticeName: string | null;
  placementTechSupervisorFio: string | null;
  placementTechSupervisorPosition: string | null;
  placementTechSupervisorPhone: string | null;
  placementOrgSupervisorFio: string | null;
}

export interface StudentProfileUpdatePayload {
  fio: string;
  groupId: number;
  phone: string;
  organizationId: number | null;
  placementOrgName: string;
  placementOrgAddress: string;
  placementOrgEmail: string;
  placementOrgPhone: string;
  placementOrgHeadFio: string;
  placementOrgHeadPosition: string;
  placementPracticeRespFio: string;
  placementPracticeRespPosition: string;
  placementPracticeRespPhone: string;
  placementMetroMin: number | null;
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
}

export interface StudentProfileMe extends StudentPlacementFields {
  id: number;
  userId: number;
  fio: string | null;
  groupId: number | null;
  organizationId: number | null;
  phone: string | null;
  reviewStatus: ProfileReviewStatus;
  reviewedById: number | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  group: { id: number; groupName: string; groupIndex: string } | null;
  organization: Organization | null;
  reviewedBy: { id: number; name: string; email: string } | null;
  isProfileComplete: boolean;
  canEdit: boolean;
  canSubmitForReview: boolean;
  /** true только при APPROVED — можно начать новую заявку на ПП с другими датами */
  canStartNewProductionPractice?: boolean;
}

export interface StudentProfilePendingRow extends StudentPlacementFields {
  id: number;
  userId: number;
  fio: string | null;
  groupId: number | null;
  organizationId: number | null;
  phone: string | null;
  reviewStatus: ProfileReviewStatus;
  user: { id: number; email: string; name: string };
  group: { id: number; groupName: string; groupIndex: string } | null;
  organization: Organization | null;
}

export interface Organization {
  id: number;
  name: string;
  address: string;
  email: string;
  phone: string;
  supervisorOrgFio: string;
  supervisorOrgPosition: string;
  practiceResponsibleFio: string;
  practiceResponsiblePosition: string;
  practiceResponsiblePhone: string;
  timeToNearestMetroMin: number;
  createdAt: string;
  updatedAt: string;
}

export interface Module {
  id: number;
  moduleIndex: string;
  moduleName: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Practice {
  id: number;
  practiceIndex: string;
  practiceName: string;
  moduleId: number;
  module: Module;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: number;
  groupName: string;
  /** Направление: Э, П, ИП и т.д. */
  groupIndex: string;
  _count?: { students: number };
  createdAt: string;
  updatedAt: string;
}

/** Справочник: индекс группы → как показывать в отчётах (напр. 09.02.07 (П)). */
export interface GroupIndexLabel {
  id: number;
  indexKey: string;
  exportLabel: string;
  createdAt: string;
  updatedAt: string;
}

/** Слот практики по графику для квалификации (свои даты). */
export interface QualificationPracticeOffer {
  id: number;
  groupIndexLabelId: number;
  practiceId: number;
  periodStart: string;
  periodEnd: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  groupIndexLabel?: GroupIndexLabel;
  practice?: Practice;
}

/** Ответ API вариантов практик для выбранной группы (анкета студента). */
export interface StudentPracticeOffersPayload {
  qualificationLabel: string | null;
  indexKey: string;
  offers: {
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
  }[];
}

export interface TechSupervisor {
  id: number;
  fio: string;
  position: string;
  phone: string;
  _count?: { assignments: number };
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: number;
  fio: string;
  groupId: number;
  group: Group;
  assignments: Assignment[];
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: number;
  studentId: number;
  practiceId: number;
  organizationId: number;
  techSupervisorId: number;
  orgSupervisorFio: string;
  student: Student;
  practice: Practice;
  organization: Organization;
  techSupervisor: TechSupervisor;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardData {
  totalStudents: number;
  totalOrganizations: number;
  totalPractices: number;
  totalSupervisors: number;
  totalAssignments: number;
  supervisorStats: SupervisorStat[];
}

export interface SupervisorStat {
  id: number;
  fio: string;
  position: string;
  phone: string;
  studentCount: number;
}

export interface SupervisorLoad extends SupervisorStat {
  organizations: { id: number; name: string }[];
}

export interface ApiError {
  error?: string;
  errors?: { msg: string; path: string }[];
}
