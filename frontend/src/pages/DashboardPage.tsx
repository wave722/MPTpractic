import { useQuery } from '@tanstack/react-query';
import {
  Users, Building2, BookOpen, UserCheck,
  ClipboardList, TrendingUp, User
} from 'lucide-react';
import { analyticsApi } from '@/api';
import { PageLoader } from '@/components/ui/Spinner';
import { PageHeader } from '@/components/ui/PageHeader';
import type { DashboardData } from '@/types';

function StatCard({
  title, value, icon: Icon, color
}: { title: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.getDashboard().then((r) => r.data),
  });

  if (isLoading) return <PageLoader />;

  const stats = [
    { title: 'Студентов', value: data?.totalStudents ?? 0, icon: Users, color: 'bg-blue-500' },
    { title: 'Организаций', value: data?.totalOrganizations ?? 0, icon: Building2, color: 'bg-emerald-500' },
    { title: 'Практик', value: data?.totalPractices ?? 0, icon: BookOpen, color: 'bg-violet-500' },
    { title: 'Руководителей ПП', value: data?.totalSupervisors ?? 0, icon: UserCheck, color: 'bg-orange-500' },
    { title: 'Назначений', value: data?.totalAssignments ?? 0, icon: ClipboardList, color: 'bg-rose-500' },
  ];

  return (
    <div>
      <PageHeader
        title="Дашборд"
        subtitle="Общая статистика системы"
        icon={<TrendingUp size={20} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      {/* Supervisor Load Table */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-primary-600" />
            <h2 className="font-semibold text-gray-900">Нагрузка руководителей ПП от техникума</h2>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Количество студентов, закреплённых за каждым руководителем</p>
        </div>
        <div className="table-wrap rounded-none rounded-b-xl border-none">
          <table className="table">
            <thead>
              <tr>
                <th>ФИО руководителя</th>
                <th>Должность</th>
                <th>Телефон</th>
                <th className="text-center">Кол-во студентов</th>
              </tr>
            </thead>
            <tbody>
              {data?.supervisorStats.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
                        <User size={12} className="text-primary-600" />
                      </div>
                      {s.fio}
                    </div>
                  </td>
                  <td className="text-gray-500">{s.position}</td>
                  <td className="text-gray-500">{s.phone}</td>
                  <td className="text-center">
                    <span className={`badge ${s.studentCount > 10 ? 'badge-red' : s.studentCount > 5 ? 'badge-yellow' : 'badge-green'}`}>
                      {s.studentCount}
                    </span>
                  </td>
                </tr>
              ))}
              {!data?.supervisorStats.length && (
                <tr>
                  <td colSpan={4} className="text-center text-gray-400 py-8">Данных нет</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
