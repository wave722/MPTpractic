import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, User, Users, Building2, UserCheck, Phone, Mail, Clock, MapPin, Calendar } from 'lucide-react';
import { studentsApi } from '@/api';
import { PageLoader } from '@/components/ui/Spinner';
import { PageHeader } from '@/components/ui/PageHeader';
import type { Student } from '@/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export function SearchPage() {
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');

  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ['students-search', submitted],
    queryFn: () => studentsApi.getAll({ search: submitted }).then((r) => r.data),
    enabled: submitted.length >= 2,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(search);
  };

  return (
    <div>
      <PageHeader
        title="Поиск студента"
        subtitle="Полная карточка с назначениями"
        icon={<Search size={20} />}
      />

      <div className="card p-4 mb-6">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Введите ФИО студента (минимум 2 символа)..."
              className="input pl-9"
            />
          </div>
          <button type="submit" className="btn-primary px-6">Найти</button>
        </form>
      </div>

      {isLoading && <PageLoader />}

      {submitted && !isLoading && students.length === 0 && (
        <div className="card p-8 text-center text-gray-500">
          Студенты не найдены по запросу «{submitted}»
        </div>
      )}

      <div className="space-y-6">
        {students.map((student) => (
          <StudentCard key={student.id} student={student} />
        ))}
      </div>
    </div>
  );
}

function StudentCard({ student }: { student: Student }) {
  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-800 to-primary-700 px-6 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <User size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">{student.fio}</h2>
            <div className="flex items-center gap-2 text-primary-200 text-sm">
              <Users size={13} />
              Группа: <span className="font-medium text-white">{student.group.groupName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Assignments */}
      {student.assignments.length === 0 ? (
        <div className="p-6 text-center text-gray-400 text-sm">Назначений нет</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {student.assignments.map((a) => (
            <div key={a.id} className="p-5">
              {/* Practice info */}
              <div className="flex items-center gap-2 mb-4">
                <span className="badge badge-blue font-mono">{a.practice.practiceIndex}</span>
                <span className="font-semibold text-gray-900">{a.practice.practiceName}</span>
                <span className="badge badge-gray ml-auto">
                  <Calendar size={11} className="mr-1" />
                  {format(new Date(a.practice.periodStart), 'dd.MM.yyyy', { locale: ru })}
                  {' — '}
                  {format(new Date(a.practice.periodEnd), 'dd.MM.yyyy', { locale: ru })}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Модуль: {a.practice.module.moduleIndex} — {a.practice.module.moduleName}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Organization */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 size={15} className="text-primary-600" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Организация</span>
                  </div>
                  <p className="font-medium text-gray-900 mb-2">{a.organization.name}</p>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-gray-400 shrink-0" />
                      {a.organization.address}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-gray-400 shrink-0" />
                      {a.organization.timeToNearestMetroMin} мин до метро/МЦД
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone size={12} className="text-gray-400 shrink-0" />
                      {a.organization.phone}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail size={12} className="text-gray-400 shrink-0" />
                      {a.organization.email}
                    </div>
                  </div>
                </div>

                {/* Supervisors */}
                <div className="space-y-3">
                  <div className="bg-blue-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <UserCheck size={14} className="text-blue-600" />
                      <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Рук. от техникума</span>
                    </div>
                    <p className="font-medium text-gray-900 text-sm">{a.techSupervisor.fio}</p>
                    <p className="text-xs text-gray-500">{a.techSupervisor.position}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
                      <Phone size={11} className="text-gray-400" />
                      {a.techSupervisor.phone}
                    </div>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <User size={14} className="text-emerald-600" />
                      <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Рук. от организации</span>
                    </div>
                    <p className="font-medium text-gray-900 text-sm">{a.orgSupervisorFio}</p>
                    <p className="text-xs text-gray-500">{a.organization.practiceResponsiblePosition}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
                      <Phone size={11} className="text-gray-400" />
                      {a.organization.practiceResponsiblePhone}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
