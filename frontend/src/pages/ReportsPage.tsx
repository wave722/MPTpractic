import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileDown, Download, Building2, FileSpreadsheet, Info, GraduationCap } from 'lucide-react';
import { organizationsApi, practicesApi, reportsApi, assignmentsApi, groupsApi, groupIndexLabelsApi } from '@/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageLoader } from '@/components/ui/Spinner';
import type { Organization, Practice, Assignment, Group, GroupIndexLabel } from '@/types';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth';
import { groupsMatchingIndex } from '@/lib/groupIndex';
import { exportLabelForIndex, sortedAdminGroupIndexKeys } from '@/lib/groupIndexLabelDisplay';

const studentBasesColumns = [
  '№ п/п',
  'Наименование организации',
  'Ф.И.О. студента',
  'Группа',
  'Руководитель практической подготовки от техникума',
  'Руководитель практической подготовки от организации',
];

function orgsFromAssignments(as: Assignment[]): { id: number; name: string }[] {
  const m = new Map<number, string>();
  as.forEach((a) => m.set(a.organization.id, a.organization.name));
  return [...m.entries()].map(([id, name]) => ({ id, name })).sort((x, y) => x.name.localeCompare(y.name, 'ru'));
}

function practicesFromAssignments(as: Assignment[]): Practice[] {
  const m = new Map<number, Practice>();
  as.forEach((a) => m.set(a.practice.id, a.practice));
  return [...m.values()].sort((a, b) => a.practiceIndex.localeCompare(b.practiceIndex, 'ru'));
}

function groupsFromAssignments(as: Assignment[]): Group[] {
  const m = new Map<number, Group>();
  as.forEach((a) => m.set(a.student.group.id, a.student.group));
  return [...m.values()].sort((a, b) => {
    const i = a.groupIndex.localeCompare(b.groupIndex, 'ru');
    return i !== 0 ? i : a.groupName.localeCompare(b.groupName, 'ru');
  });
}

const fullExportFields = [
  'ID организации',
  'Название организации',
  'Адрес',
  'Email',
  'Телефон организации',
  'Должность руководителя от организации',
  'ФИО руководителя от организации',
  'ФИО ответственного за практику от организации',
  'Должность ответственного',
  'Телефон ответственного',
  'Время до ближайшей станции метро/МЦД (мин.)',
  'ФИО студента',
  'Группа',
  'Код специальности (индекс)',
  'Индекс ПП',
  'Название практики',
  'Индекс модуля',
  'Название модуля',
  'Период: дата начала',
  'Период: дата окончания',
  'Руководитель от техникума (ФИО)',
  'Должность рук. от техникума',
  'Телефон рук. от техникума',
  'Руководитель от организации (ФИО)',
];

export function ReportsPage() {
  const { user } = useAuthStore();
  const isMethodist = user?.role === 'METHODIST';

  const [orgStudent, setOrgStudent] = useState('');
  const [practiceId, setPracticeId] = useState('');
  const [studentBasesGroupIndex, setStudentBasesGroupIndex] = useState('');
  const [groupIdStudent, setGroupIdStudent] = useState('');
  const [orgFull, setOrgFull] = useState('');
  const [fullGroupIndex, setFullGroupIndex] = useState('');
  const [fullGroupId, setFullGroupId] = useState('');
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [loadingFull, setLoadingFull] = useState(false);

  const { data: orgsAdmin = [], isLoading: orgsAdminLoading } = useQuery<Organization[]>({
    queryKey: ['organizations'],
    queryFn: () => organizationsApi.getAll().then((r) => r.data),
    enabled: !isMethodist,
  });

  const { data: practicesAdmin = [], isLoading: pracAdminLoading } = useQuery<Practice[]>({
    queryKey: ['practices'],
    queryFn: () => practicesApi.getAll().then((r) => r.data),
    enabled: !isMethodist,
  });

  const { data: groupsAdmin = [], isLoading: groupsAdminLoading } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: () => groupsApi.getAll().then((r) => r.data),
    enabled: !isMethodist,
  });

  const { data: assignmentsM = [], isLoading: assignLoading } = useQuery<Assignment[]>({
    queryKey: ['assignments'],
    queryFn: () => assignmentsApi.getAll().then((r) => r.data),
    enabled: isMethodist,
  });

  const orgs = useMemo(
    () => (isMethodist ? orgsFromAssignments(assignmentsM) : orgsAdmin),
    [isMethodist, assignmentsM, orgsAdmin]
  );
  const practices = useMemo(
    () => (isMethodist ? practicesFromAssignments(assignmentsM) : practicesAdmin),
    [isMethodist, assignmentsM, practicesAdmin]
  );

  const groups = useMemo(
    () => (isMethodist ? groupsFromAssignments(assignmentsM) : groupsAdmin),
    [isMethodist, assignmentsM, groupsAdmin]
  );

  const { data: groupIndexLabels = [] } = useQuery<GroupIndexLabel[]>({
    queryKey: ['group-index-labels'],
    queryFn: () => groupIndexLabelsApi.getAll(),
  });

  const groupIndicesForSelect = useMemo(
    () => sortedAdminGroupIndexKeys(groupIndexLabels),
    [groupIndexLabels]
  );

  const groupsForStudentBasesSelect = useMemo(
    () => groupsMatchingIndex(groups, studentBasesGroupIndex),
    [groups, studentBasesGroupIndex]
  );
  const groupsForFullSelect = useMemo(
    () => groupsMatchingIndex(groups, fullGroupIndex),
    [groups, fullGroupIndex]
  );

  useEffect(() => {
    if (!groupIdStudent) return;
    const ok = groupsForStudentBasesSelect.some((g) => String(g.id) === groupIdStudent);
    if (!ok) setGroupIdStudent('');
  }, [groupsForStudentBasesSelect, groupIdStudent]);

  useEffect(() => {
    if (!fullGroupId) return;
    const ok = groupsForFullSelect.some((g) => String(g.id) === fullGroupId);
    if (!ok) setFullGroupId('');
  }, [groupsForFullSelect, fullGroupId]);

  const pageLoading = isMethodist ? assignLoading : orgsAdminLoading || pracAdminLoading || groupsAdminLoading;

  const downloadStudentBases = async () => {
    setLoadingStudent(true);
    try {
      await reportsApi.exportStudentBases({
        organizationId: orgStudent ? Number(orgStudent) : undefined,
        practiceId: practiceId ? Number(practiceId) : undefined,
        groupId: groupIdStudent ? Number(groupIdStudent) : undefined,
        groupIndex:
          !groupIdStudent && studentBasesGroupIndex.trim()
            ? studentBasesGroupIndex.trim()
            : undefined,
      });
      toast.success('Файл загружен');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось сформировать файл');
    } finally {
      setLoadingStudent(false);
    }
  };

  const downloadFull = async () => {
    setLoadingFull(true);
    try {
      await reportsApi.exportXlsx(orgFull ? Number(orgFull) : undefined, {
        groupId: fullGroupId ? Number(fullGroupId) : undefined,
        groupIndex:
          !fullGroupId && fullGroupIndex.trim() ? fullGroupIndex.trim() : undefined,
      });
      toast.success('Файл загружен');
    } catch {
      toast.error('Не удалось сформировать файл');
    } finally {
      setLoadingFull(false);
    }
  };

  if (pageLoading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Отчёты и выгрузки"
        subtitle={
          isMethodist
            ? 'Выгрузка по вашим назначениям (как методисту)'
            : 'Формирование XLSX для администратора и методиста'
        }
        icon={<FileDown size={20} />}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5 border-emerald-200/80 bg-emerald-50/30">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap size={20} className="text-emerald-700" />
            <h2 className="font-semibold text-gray-900">Базы практик (форма для студентов)</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Как в файле «Базы практик … для студентов»: шапка с периодом и группами, таблица из шести столбцов.
            {isMethodist && ' Учитываются только студенты по вашим назначениям.'}
          </p>

          <div className="space-y-3 mb-4">
            <div>
              <label className="label">Организация</label>
              <select value={orgStudent} onChange={(e) => setOrgStudent(e.target.value)} className="input">
                <option value="">Все организации</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Практика (необязательно)</label>
              <select value={practiceId} onChange={(e) => setPracticeId(e.target.value)} className="input">
                <option value="">Все практики</option>
                {practices.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.practiceIndex} — {p.practiceName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Индекс группы (П, ВД, ИСиП…)</label>
              <select
                value={studentBasesGroupIndex}
                onChange={(e) => {
                  setStudentBasesGroupIndex(e.target.value);
                  setGroupIdStudent('');
                }}
                className="input"
              >
                <option value="">Все направления</option>
                {groupIndicesForSelect.map((idx) => (
                  <option key={idx} value={idx}>
                    {exportLabelForIndex(groupIndexLabels, idx)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Список направлений берётся из раздела «Коды индексов групп»; добавьте туда нужный индекс, чтобы
                он появился здесь.
              </p>
            </div>
            <div>
              <label className="label">Группа (необязательно)</label>
              <select value={groupIdStudent} onChange={(e) => setGroupIdStudent(e.target.value)} className="input">
                <option value="">
                  {studentBasesGroupIndex.trim() ? 'Все группы выбранного направления' : 'Все группы'}
                </option>
                {groupsForStudentBasesSelect.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.groupName}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Конкретная группа или весь индекс, если оставить «Все группы…»
              </p>
            </div>
          </div>

          <button
            onClick={() => void downloadStudentBases()}
            disabled={loadingStudent}
            className="btn-primary w-full justify-center"
          >
            <Download size={16} />
            {loadingStudent ? 'Формирование…' : 'Скачать XLSX (для студентов)'}
          </button>

          <div className="mt-4 pt-4 border-t border-emerald-100">
            <p className="text-xs font-medium text-gray-700 mb-2">Столбцы таблицы</p>
            <ul className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
              {studentBasesColumns.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileSpreadsheet size={18} className="text-emerald-600" />
              <h2 className="font-semibold text-gray-900">Полная выгрузка (все поля)</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Расширенный отчёт по организациям и назначениям — для внутреннего учёта.
            </p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="label">Организация</label>
                <select value={orgFull} onChange={(e) => setOrgFull(e.target.value)} className="input">
                  <option value="">Все организации</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Индекс группы (необязательно)</label>
                <select
                  value={fullGroupIndex}
                  onChange={(e) => {
                    setFullGroupIndex(e.target.value);
                    setFullGroupId('');
                  }}
                  className="input"
                >
                  <option value="">Все направления</option>
                  {groupIndicesForSelect.map((idx) => (
                    <option key={idx} value={idx}>
                      {exportLabelForIndex(groupIndexLabels, idx)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Группа (необязательно)</label>
                <select
                  value={fullGroupId}
                  onChange={(e) => setFullGroupId(e.target.value)}
                  className="input"
                >
                  <option value="">
                    {fullGroupIndex.trim() ? 'Все группы выбранного направления' : 'Все группы'}
                  </option>
                  {groupsForFullSelect.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.groupName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={() => void downloadFull()}
              disabled={loadingFull}
              className="btn-secondary w-full justify-center"
            >
              <Download size={16} />
              {loadingFull ? 'Формирование…' : 'Скачать полный XLSX'}
            </button>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={18} className="text-primary-600" />
              <h2 className="font-semibold text-gray-900">Поля полной выгрузки</h2>
              <span className="badge badge-gray ml-auto">{fullExportFields.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {fullExportFields.map((field, i) => (
                <div key={i} className="flex items-center gap-2 text-sm py-1 px-2 rounded bg-gray-50">
                  <span className="w-5 h-5 bg-primary-100 text-primary-700 rounded text-xs flex items-center justify-center font-mono shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-gray-700">{field}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-start gap-2">
              <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />
              <div className="text-xs text-gray-600 space-y-1">
                <p>Файл «для студентов»: UTF-8, автофильтр, закреплённая шапка таблицы (строка с № п/п).</p>
                <p>
                  Строка со специальностями и подписи индексов в селектах берутся из{' '}
                  <Link to="/group-index-labels" className="text-primary-700 underline hover:no-underline">
                    справочника кодов индексов
                  </Link>
                  ; остальное — по данным выгрузки (практика, группы, период).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
