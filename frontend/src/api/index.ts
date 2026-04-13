import api from './client';
import type {
  Organization, Module, Practice, Group, GroupIndexLabel, QualificationPracticeOffer,
  TechSupervisor, Student, Assignment,
  DashboardData, SupervisorLoad,
  MeResponse,
  StudentAccess,
  StudentProfileMe,
  StudentProfilePendingRow,
  StudentProfileUpdatePayload,
  StudentPracticeOffersPayload,
} from '@/types';

export interface AuthSuccessPayload {
  token: string;
  user: { id: number; email: string; name: string; role: string };
  studentAccess?: StudentAccess;
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthSuccessPayload>('/auth/login', { email, password }),
  registerStudent: (body: { email: string; password: string; name: string }) =>
    api.post<AuthSuccessPayload>('/auth/register-student', body),
  me: () => api.get<MeResponse>('/auth/me'),
};

export const studentProfileApi = {
  getLookups: () =>
    api.get<{
      groups: { id: number; groupName: string; groupIndex: string }[];
      organizations: Organization[];
      groupIndexLabels: { indexKey: string; exportLabel: string }[];
    }>('/student-profile/lookups'),
  getPracticeOffers: (groupId: number) =>
    api
      .get<StudentPracticeOffersPayload>('/student-profile/practice-offers', {
        params: { groupId },
      })
      .then((r) => r.data),
  getMe: () => api.get<StudentProfileMe>('/student-profile/me'),
  updateMe: (body: StudentProfileUpdatePayload) => api.put<StudentProfileMe>('/student-profile/me', body),
  submitMe: () =>
    api.post<StudentProfileMe & { message: string }>('/student-profile/me/submit'),
  newProductionPractice: () =>
    api.post<StudentProfileMe & { message: string }>('/student-profile/me/new-production-practice'),
  moderationPending: () => api.get<StudentProfilePendingRow[]>('/student-profile/moderation/pending'),
  moderationGet: (userId: number) => api.get<StudentProfileMe>(`/student-profile/moderation/${userId}`),
  moderationReview: (userId: number, body: { decision: 'approve' | 'reject'; rejectionReason?: string }) =>
    api.post<StudentProfileMe>(`/student-profile/moderation/${userId}/review`, body),
};

// Organizations
export const organizationsApi = {
  getAll: () => api.get<Organization[]>('/organizations'),
  getById: (id: number) => api.get<Organization>(`/organizations/${id}`),
  create: (data: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<Organization>('/organizations', data),
  update: (id: number, data: Partial<Organization>) =>
    api.put<Organization>(`/organizations/${id}`, data),
  delete: (id: number) => api.delete(`/organizations/${id}`),
};

// Modules
export const modulesApi = {
  getAll: () => api.get<Module[]>('/modules'),
  getById: (id: number) => api.get<Module>(`/modules/${id}`),
  create: (data: { moduleIndex: string; moduleName: string }) =>
    api.post<Module>('/modules', data),
  update: (id: number, data: Partial<Module>) => api.put<Module>(`/modules/${id}`, data),
  archive: (id: number) => api.patch<Module>(`/modules/${id}/archive`),
  delete: (id: number) => api.delete(`/modules/${id}`),
};

// Practices
export const practicesApi = {
  getAll: () => api.get<Practice[]>('/practices'),
  getById: (id: number) => api.get<Practice>(`/practices/${id}`),
  create: (data: Omit<Practice, 'id' | 'module' | 'createdAt' | 'updatedAt'>) =>
    api.post<Practice>('/practices', data),
  update: (id: number, data: Partial<Practice>) => api.put<Practice>(`/practices/${id}`, data),
  delete: (id: number) => api.delete(`/practices/${id}`),
};

// Groups
export const groupsApi = {
  getAll: (params?: { groupIndex?: string }) => api.get<Group[]>('/groups', { params }),
  getById: (id: number) => api.get<Group>(`/groups/${id}`),
  create: (data: { groupName: string; groupIndex?: string }) => api.post<Group>('/groups', data),
  update: (id: number, data: { groupName: string; groupIndex?: string }) =>
    api.put<Group>(`/groups/${id}`, data),
  delete: (id: number) => api.delete(`/groups/${id}`),
};

// Tech Supervisors
export const techSupervisorsApi = {
  getAll: () => api.get<TechSupervisor[]>('/tech-supervisors'),
  getById: (id: number) => api.get<TechSupervisor>(`/tech-supervisors/${id}`),
  create: (data: { fio: string; position: string; phone: string }) =>
    api.post<TechSupervisor>('/tech-supervisors', data),
  update: (id: number, data: Partial<TechSupervisor>) =>
    api.put<TechSupervisor>(`/tech-supervisors/${id}`, data),
  delete: (id: number) => api.delete(`/tech-supervisors/${id}`),
};

// Students
export const studentsApi = {
  getAll: (params?: {
    search?: string;
    groupId?: number;
    groupIndex?: string;
    organizationId?: number;
    practiceId?: number;
    techSupervisorId?: number;
  }) => api.get<Student[]>('/students', { params }),
  getById: (id: number) => api.get<Student>(`/students/${id}`),
  create: (data: { fio: string; groupId: number }) => api.post<Student>('/students', data),
  update: (id: number, data: { fio?: string; groupId?: number }) =>
    api.put<Student>(`/students/${id}`, data),
  delete: (id: number) => api.delete(`/students/${id}`),
};

// Assignments
export const assignmentsApi = {
  getAll: (params?: {
    organizationId?: number;
    practiceId?: number;
    groupId?: number;
    groupIndex?: string;
    techSupervisorId?: number;
  }) => api.get<Assignment[]>('/assignments', { params }),
  getById: (id: number) => api.get<Assignment>(`/assignments/${id}`),
  create: (data: {
    studentId: number;
    practiceId: number;
    organizationId: number;
    techSupervisorId: number;
    orgSupervisorFio: string;
  }) => api.post<Assignment>('/assignments', data),
  update: (
    id: number,
    data: { organizationId?: number; techSupervisorId?: number; orgSupervisorFio?: string }
  ) => api.put<Assignment>(`/assignments/${id}`, data),
  delete: (id: number) => api.delete(`/assignments/${id}`),
};

// Analytics
export const analyticsApi = {
  getDashboard: () => api.get<DashboardData>('/analytics/dashboard'),
  getSupervisorLoad: () => api.get<SupervisorLoad[]>('/analytics/supervisor-load'),
};

function downloadReportBlob(
  pathWithQuery: string,
  defaultFilename: string
): Promise<void> {
  const token = localStorage.getItem('token');
  return fetch(pathWithQuery, { headers: { Authorization: `Bearer ${token}` } }).then(async (res) => {
    const blob = await res.blob();
    if (!res.ok) {
      try {
        const j = JSON.parse(await blob.text());
        throw new Error(j.error ?? 'Ошибка выгрузки');
      } catch (e) {
        if (e instanceof Error && e.message !== 'Unexpected token') throw e;
        throw new Error('Ошибка выгрузки');
      }
    }
    const cd = res.headers.get('Content-Disposition');
    const m = cd?.match(/filename="?([^";]+)"?/);
    const filename = m?.[1] ?? defaultFilename;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  });
}

// Справочник кодов индексов групп (отчёты)
export const qualificationPracticeOffersApi = {
  getLookups: () =>
    api
      .get<{ groupIndexLabels: GroupIndexLabel[]; practices: Practice[] }>(
        '/qualification-practice-offers/lookups'
      )
      .then((r) => r.data),
  getAll: (params?: { groupIndexLabelId?: number }) =>
    api
      .get<QualificationPracticeOffer[]>('/qualification-practice-offers', { params })
      .then((r) => r.data),
  create: (data: {
    groupIndexLabelId: number;
    practiceId: number;
    periodStart: string;
    periodEnd: string;
    note?: string;
  }) => api.post<QualificationPracticeOffer>('/qualification-practice-offers', data),
  update: (
    id: number,
    data: Partial<{
      groupIndexLabelId: number;
      practiceId: number;
      periodStart: string;
      periodEnd: string;
      note: string;
    }>
  ) => api.put<QualificationPracticeOffer>(`/qualification-practice-offers/${id}`, data),
  delete: (id: number) => api.delete(`/qualification-practice-offers/${id}`),
};

export const groupIndexLabelsApi = {
  getAll: () => api.get<GroupIndexLabel[]>('/group-index-labels').then((r) => r.data),
  create: (data: { indexKey: string; exportLabel: string }) =>
    api.post<GroupIndexLabel>('/group-index-labels', data),
  update: (id: number, data: { indexKey: string; exportLabel: string }) =>
    api.put<GroupIndexLabel>(`/group-index-labels/${id}`, data),
  delete: (id: number) => api.delete(`/group-index-labels/${id}`),
};

// Reports
export const reportsApi = {
  getGroupIndices: () => api.get<string[]>('/reports/group-indices').then((r) => r.data),
  exportXlsx: (
    organizationId?: number,
    opts?: { groupId?: number; groupIndex?: string }
  ) => {
    const sp = new URLSearchParams();
    if (organizationId) sp.set('organizationId', String(organizationId));
    if (opts?.groupId) sp.set('groupId', String(opts.groupId));
    if (opts?.groupIndex?.trim()) sp.set('groupIndex', opts.groupIndex.trim());
    const q = sp.toString();
    return downloadReportBlob(
      `/api/reports/export${q ? `?${q}` : ''}`,
      `practice_export_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  },
  exportStudentBases: (params?: {
    organizationId?: number;
    practiceId?: number;
    groupId?: number;
    groupIndex?: string;
  }) => {
    const sp = new URLSearchParams();
    if (params?.organizationId) sp.set('organizationId', String(params.organizationId));
    if (params?.practiceId) sp.set('practiceId', String(params.practiceId));
    if (params?.groupId) sp.set('groupId', String(params.groupId));
    if (params?.groupIndex?.trim()) sp.set('groupIndex', params.groupIndex.trim());
    const q = sp.toString();
    return downloadReportBlob(
      `/api/reports/export/student-bases${q ? `?${q}` : ''}`,
      `bazy_praktik_dlya_studentov_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  },
};
