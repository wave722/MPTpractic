import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Building2, Calendar, Users } from 'lucide-react';
import { assignmentsApi } from '@/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageLoader } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/auth';
import type { Assignment } from '@/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export function MyAssignmentsPage() {
  const user = useAuthStore((s) => s.user);
  const isStudent = user?.role === 'STUDENT';

  const { data = [], isLoading } = useQuery<Assignment[]>({
    queryKey: ['my-assignments', user?.id, user?.role],
    queryFn: () => assignmentsApi.getAll().then((r) => r.data),
  });

  if (isLoading) return <PageLoader />;

  const subtitle = isStudent
    ? `Ваши назначения (только начатые и текущие практики): ${data.length}`
    : `Назначений: ${data.length}`;

  return (
    <div>
      <PageHeader
        title={isStudent ? 'Мои назначения' : 'Мои задания'}
        subtitle={subtitle}
        icon={<ClipboardList size={20} />}
      />

      {isStudent && (
        <p className="text-sm text-gray-500 mb-4">
          Отображаются только практики, у которых уже наступила дата начала. Будущие периоды скрыты до начала практики.
        </p>
      )}

      <div className="card">
        <div className="table-wrap rounded-xl border-none">
          <table className="table">
            <thead>
              <tr>
                {!isStudent && <th>Студент</th>}
                <th>Группа</th>
                <th>Практика</th>
                <th>Период</th>
                <th>Организация</th>
              </tr>
            </thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.id}>
                  {!isStudent && <td className="font-medium">{a.student.fio}</td>}
                  <td>
                    <span className="badge badge-blue">
                      <Users size={11} className="mr-1" />
                      {a.student.group.groupName}
                    </span>
                  </td>
                  <td>
                    <div className="text-xs">
                      <span className="badge badge-gray mr-1 font-mono">{a.practice.practiceIndex}</span>
                      <span className="font-medium">{a.practice.practiceName}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Модуль: {a.practice.module.moduleIndex} — {a.practice.module.moduleName}
                    </div>
                  </td>
                  <td className="text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-gray-400" />
                      {format(new Date(a.practice.periodStart), 'dd.MM.yyyy', { locale: ru })}
                      {' — '}
                      {format(new Date(a.practice.periodEnd), 'dd.MM.yyyy', { locale: ru })}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-primary-600 shrink-0" />
                      <div>
                        <div className="font-medium text-gray-900">{a.organization.name}</div>
                        <div className="text-xs text-gray-500">
                          {a.organization.phone} · {a.organization.email}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={isStudent ? 4 : 5} className="text-center text-gray-400 py-10">
                    {isStudent ? 'Нет назначений с уже начавшейся практикой' : 'Назначений нет'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
