import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { GraduationCap, Plus, Pencil, Trash2, ClipboardList, Filter } from 'lucide-react';
import {
  studentsApi,
  groupsApi,
  organizationsApi,
  practicesApi,
  techSupervisorsApi,
  assignmentsApi,
  groupIndexLabelsApi,
} from '@/api';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/auth';
import type { Student, Group, Organization, Practice, TechSupervisor, GroupIndexLabel } from '@/types';
import { exportLabelForIndex, sortedAdminGroupIndexKeys } from '@/lib/groupIndexLabelDisplay';
import toast from 'react-hot-toast';
import { groupsMatchingIndex } from '@/lib/groupIndex';

export function StudentsPage() {
  const qc = useQueryClient();
  const { isAdmin, isMethodist } = useAuthStore();

  const [search, setSearch] = useState('');
  const [filterGroupIndex, setFilterGroupIndex] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterOrg, setFilterOrg] = useState('');
  const [filterPractice, setFilterPractice] = useState('');
  const [filterSupervisor, setFilterSupervisor] = useState('');

  const [studentModal, setStudentModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [assignStudent, setAssignStudent] = useState<Student | null>(null);
  const [deleteItem, setDeleteItem] = useState<Student | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [modalGroupIndex, setModalGroupIndex] = useState('');

  const params = {
    search: search || undefined,
    groupId: filterGroup ? Number(filterGroup) : undefined,
    groupIndex:
      !filterGroup && filterGroupIndex.trim() ? filterGroupIndex.trim() : undefined,
    organizationId: filterOrg ? Number(filterOrg) : undefined,
    practiceId: filterPractice ? Number(filterPractice) : undefined,
    techSupervisorId: filterSupervisor ? Number(filterSupervisor) : undefined,
  };

  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ['students', params],
    queryFn: () => studentsApi.getAll(params).then((r) => r.data),
  });

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: () => groupsApi.getAll().then((r) => r.data),
  });

  const { data: groupIndexLabels = [] } = useQuery<GroupIndexLabel[]>({
    queryKey: ['group-index-labels'],
    queryFn: () => groupIndexLabelsApi.getAll(),
  });

  const groupIndices = useMemo(() => sortedAdminGroupIndexKeys(groupIndexLabels), [groupIndexLabels]);
  const groupsForFilterSelect = useMemo(
    () => groupsMatchingIndex(groups, filterGroupIndex),
    [groups, filterGroupIndex]
  );
  const groupsForModal = useMemo(() => groupsMatchingIndex(groups, modalGroupIndex), [groups, modalGroupIndex]);

  useEffect(() => {
    if (!filterGroup) return;
    const g = groups.find((x) => x.id === Number(filterGroup));
    if (filterGroupIndex.trim() && g && g.groupIndex !== filterGroupIndex.trim()) setFilterGroup('');
  }, [filterGroupIndex, filterGroup, groups]);
  const { data: orgs = [] } = useQuery<Organization[]>({ queryKey: ['organizations'], queryFn: () => organizationsApi.getAll().then((r) => r.data) });
  const { data: practices = [] } = useQuery<Practice[]>({ queryKey: ['practices'], queryFn: () => practicesApi.getAll().then((r) => r.data) });
  const { data: supervisors = [] } = useQuery<TechSupervisor[]>({ queryKey: ['tech-supervisors'], queryFn: () => techSupervisorsApi.getAll().then((r) => r.data) });

  const {
    register: regStudent,
    handleSubmit: hsStudent,
    reset: rsStudent,
    resetField: resetStudentGroupField,
    formState: { errors: errStudent },
  } = useForm<{ fio: string; groupId: number }>();
  const { register: regAssign, handleSubmit: hsAssign, reset: rsAssign, formState: { errors: errAssign } } = useForm<{
    practiceId: number; organizationId: number; techSupervisorId: number; orgSupervisorFio: string;
  }>();

  const createStudentMut = useMutation({
    mutationFn: studentsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); toast.success('Студент добавлен'); setStudentModal(false); rsStudent(); },
  });

  const updateStudentMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { fio?: string; groupId?: number } }) => studentsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); toast.success('Данные обновлены'); setStudentModal(false); rsStudent(); },
  });

  const deleteStudentMut = useMutation({
    mutationFn: (id: number) => studentsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); toast.success('Студент удалён'); setDeleteItem(null); },
  });

  const createAssignMut = useMutation({
    mutationFn: assignmentsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); toast.success('Назначение создано'); setAssignModal(false); rsAssign(); },
    onError: () => toast.error('Студент уже назначен на эту практику'),
  });

  if (isLoading) return <PageLoader />;

  const hasFilters = filterGroup || filterGroupIndex || filterOrg || filterPractice || filterSupervisor;

  return (
    <div>
      <PageHeader
        title="Реестр студентов"
        subtitle={`${students.length} студентов`}
        icon={<GraduationCap size={20} />}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilters(!showFilters)} className={`btn-secondary ${hasFilters ? 'ring-2 ring-primary-400' : ''}`}>
              <Filter size={15} /> Фильтры {hasFilters && '•'}
            </button>
            {isMethodist() && (
              <button
                onClick={() => {
                  setEditStudent(null);
                  rsStudent();
                  setModalGroupIndex('');
                  setStudentModal(true);
                }}
                className="btn-primary"
              >
                <Plus size={16} /> Добавить студента
              </button>
            )}
          </div>
        }
      />

      {/* Search + filters */}
      <div className="card p-4 mb-4 space-y-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по ФИО студента..."
          className="input"
        />
        {showFilters && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <select
              value={filterGroupIndex}
              onChange={(e) => {
                setFilterGroupIndex(e.target.value);
                setFilterGroup('');
              }}
              className="input"
            >
              <option value="">Все направления</option>
              {groupIndices.map((idx) => (
                <option key={idx} value={idx}>
                  {exportLabelForIndex(groupIndexLabels, idx)}
                </option>
              ))}
            </select>
            <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)} className="input">
              <option value="">
                {filterGroupIndex.trim() ? 'Все группы направления' : 'Все группы'}
              </option>
              {groupsForFilterSelect.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.groupName}
                </option>
              ))}
            </select>
            <select value={filterOrg} onChange={(e) => setFilterOrg(e.target.value)} className="input">
              <option value="">Все организации</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <select value={filterPractice} onChange={(e) => setFilterPractice(e.target.value)} className="input">
              <option value="">Все практики</option>
              {practices.map((p) => <option key={p.id} value={p.id}>{p.practiceIndex} — {p.practiceName}</option>)}
            </select>
            <select value={filterSupervisor} onChange={(e) => setFilterSupervisor(e.target.value)} className="input">
              <option value="">Все руководители</option>
              {supervisors.map((s) => <option key={s.id} value={s.id}>{s.fio}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="card">
        <div className="table-wrap rounded-xl border-none">
          <table className="table">
            <thead>
              <tr>
                <th>ФИО студента</th>
                <th>Группа</th>
                <th>Практики / Назначения</th>
                {isMethodist() && <th className="text-right">Действия</th>}
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">{s.fio}</td>
                  <td>
                    <span className="badge badge-gray text-xs mr-1">{s.group.groupIndex || '—'}</span>
                    <span className="badge badge-blue">{s.group.groupName}</span>
                  </td>
                  <td>
                    <div className="space-y-1">
                      {s.assignments.map((a) => (
                        <div key={a.id} className="text-xs text-gray-600">
                          <span className="badge badge-gray mr-1">{a.practice.practiceIndex}</span>
                          {a.organization.name}
                        </div>
                      ))}
                      {s.assignments.length === 0 && (
                        <span className="text-xs text-gray-400">Нет назначений</span>
                      )}
                    </div>
                  </td>
                  {isMethodist() && (
                    <td>
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => {
                            setAssignStudent(s);
                            rsAssign();
                            setAssignModal(true);
                          }}
                          className="btn-ghost p-1.5 text-primary-600"
                          title="Назначить на практику"
                        >
                          <ClipboardList size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setEditStudent(s);
                            rsStudent({ fio: s.fio, groupId: s.groupId });
                            setModalGroupIndex(s.group.groupIndex || '');
                            setStudentModal(true);
                          }}
                          className="btn-ghost p-1.5"
                        >
                          <Pencil size={14} />
                        </button>
                        {isAdmin() && (
                          <button onClick={() => setDeleteItem(s)} className="btn-ghost p-1.5 text-red-500">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {students.length === 0 && (
            <EmptyState icon={GraduationCap} title="Студенты не найдены" description="Измените параметры поиска или добавьте студентов" />
          )}
        </div>
      </div>

      {/* Student Modal */}
      <Modal isOpen={studentModal} onClose={() => { setStudentModal(false); setEditStudent(null); rsStudent(); setModalGroupIndex(''); }}
        title={editStudent ? 'Редактировать студента' : 'Новый студент'} size="sm">
        <form onSubmit={hsStudent((form) => {
          const data = { fio: form.fio, groupId: Number(form.groupId) };
          if (editStudent) updateStudentMut.mutate({ id: editStudent.id, data });
          else createStudentMut.mutate(data);
        })} className="space-y-4">
          <FormField label="ФИО студента" error={errStudent.fio?.message} required>
            <input {...regStudent('fio', { required: 'Обязательное поле' })} className={`input ${errStudent.fio ? 'input-error' : ''}`} placeholder="Фамилия Имя Отчество" />
          </FormField>
          <FormField label="Индекс направления" hint="Сузить список групп (Э, П, ИП…)">
            <select
              value={modalGroupIndex}
              onChange={(e) => {
                setModalGroupIndex(e.target.value);
                resetStudentGroupField('groupId');
              }}
              className="input"
            >
              <option value="">Все направления</option>
              {groupIndices.map((idx) => (
                <option key={idx} value={idx}>
                  {exportLabelForIndex(groupIndexLabels, idx)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Группа" error={errStudent.groupId?.message} required>
            <select {...regStudent('groupId', { required: 'Выберите группу' })} className={`input ${errStudent.groupId ? 'input-error' : ''}`}>
              <option value="">Выберите группу</option>
              {groupsForModal.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.groupName}
                </option>
              ))}
            </select>
          </FormField>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => { setStudentModal(false); rsStudent(); }} className="btn-secondary">Отмена</button>
            <button type="submit" disabled={createStudentMut.isPending || updateStudentMut.isPending} className="btn-primary">
              {editStudent ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assignment Modal */}
      <Modal isOpen={assignModal} onClose={() => { setAssignModal(false); setAssignStudent(null); rsAssign(); }}
        title={`Назначить на практику: ${assignStudent?.fio}`} size="md">
        <form onSubmit={hsAssign((form) => {
          if (!assignStudent) return;
          createAssignMut.mutate({
            studentId: assignStudent.id,
            practiceId: Number(form.practiceId),
            organizationId: Number(form.organizationId),
            techSupervisorId: Number(form.techSupervisorId),
            orgSupervisorFio: form.orgSupervisorFio,
          });
        })} className="space-y-4">
          <FormField label="Практика" error={errAssign.practiceId?.message} required>
            <select {...regAssign('practiceId', { required: 'Выберите практику' })} className={`input ${errAssign.practiceId ? 'input-error' : ''}`}>
              <option value="">Выберите практику</option>
              {practices.map((p) => <option key={p.id} value={p.id}>{p.practiceIndex} — {p.practiceName}</option>)}
            </select>
          </FormField>
          <FormField label="Организация" error={errAssign.organizationId?.message} required>
            <select {...regAssign('organizationId', { required: 'Выберите организацию' })} className={`input ${errAssign.organizationId ? 'input-error' : ''}`}>
              <option value="">Выберите организацию</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </FormField>
          <FormField label="Руководитель от техникума" error={errAssign.techSupervisorId?.message} required>
            <select {...regAssign('techSupervisorId', { required: 'Выберите руководителя' })} className={`input ${errAssign.techSupervisorId ? 'input-error' : ''}`}>
              <option value="">Выберите руководителя</option>
              {supervisors.map((s) => <option key={s.id} value={s.id}>{s.fio}</option>)}
            </select>
          </FormField>
          <FormField label="Руководитель от организации (ФИО)" error={errAssign.orgSupervisorFio?.message} required>
            <input {...regAssign('orgSupervisorFio', { required: 'Обязательное поле' })} className={`input ${errAssign.orgSupervisorFio ? 'input-error' : ''}`} placeholder="Фамилия Имя Отчество" />
          </FormField>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => { setAssignModal(false); rsAssign(); }} className="btn-secondary">Отмена</button>
            <button type="submit" disabled={createAssignMut.isPending} className="btn-primary">Назначить</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => deleteItem && deleteStudentMut.mutate(deleteItem.id)}
        title="Удалить студента?"
        message={`Удалить студента "${deleteItem?.fio}"? Все назначения будут удалены.`}
        loading={deleteStudentMut.isPending}
      />
    </div>
  );
}
