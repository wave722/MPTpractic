import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserCheck, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageLoader } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { studentProfileApi } from '@/api';
import { REVIEW_STATUS_LABEL } from '@/lib/studentProfileUi';
import type { StudentProfilePendingRow } from '@/types';

export function StudentReviewsPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<StudentProfilePendingRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ['student-moderation-pending'],
    queryFn: () => studentProfileApi.moderationPending().then((r) => r.data),
  });

  const reviewMutation = useMutation({
    mutationFn: async (payload: { userId: number; decision: 'approve' | 'reject'; rejectionReason?: string }) => {
      const { data } = await studentProfileApi.moderationReview(payload.userId, {
        decision: payload.decision,
        rejectionReason: payload.rejectionReason,
      });
      return data;
    },
    onSuccess: async () => {
      toast.success('Решение сохранено');
      setSelected(null);
      setRejectReason('');
      await queryClient.invalidateQueries({ queryKey: ['student-moderation-pending'] });
    },
    onError: (err: unknown) => {
      const ax = err as { response?: { data?: { error?: string } } };
      toast.error(ax.response?.data?.error ?? 'Ошибка');
    },
  });

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Проверка анкет студентов"
        subtitle={`В очереди: ${pending.length}`}
        icon={<UserCheck size={20} />}
      />

      <div className="card table-wrap rounded-xl border-none">
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>ФИО</th>
              <th>Группа</th>
              <th>Место практики</th>
              <th>Статус</th>
              <th className="text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((row) => (
              <tr key={row.id}>
                <td className="text-sm">{row.user.email}</td>
                <td className="font-medium">{row.fio ?? '—'}</td>
                <td>{row.group?.groupName ?? '—'}</td>
                <td className="text-sm">{row.placementOrgName ?? row.organization?.name ?? '—'}</td>
                <td>
                  <span className="badge badge-blue">{REVIEW_STATUS_LABEL[row.reviewStatus]}</span>
                </td>
                <td className="text-right">
                  <button type="button" className="btn-secondary text-sm py-1.5" onClick={() => setSelected(row)}>
                    Открыть
                  </button>
                </td>
              </tr>
            ))}
            {pending.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-10">
                  Нет анкет на проверке
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={!!selected}
        onClose={() => {
          setSelected(null);
          setRejectReason('');
        }}
        title="Анкета студента"
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-500">Email</div>
                <div className="font-medium">{selected.user.email}</div>
              </div>
              <div>
                <div className="text-gray-500">Имя в системе</div>
                <div className="font-medium">{selected.user.name}</div>
              </div>
              <div>
                <div className="text-gray-500">ФИО</div>
                <div className="font-medium">{selected.fio ?? '—'}</div>
              </div>
              <div>
                <div className="text-gray-500">Телефон</div>
                <div className="font-medium">{selected.phone ?? '—'}</div>
              </div>
              <div>
                <div className="text-gray-500">Группа</div>
                <div className="font-medium">{selected.group?.groupName ?? '—'}</div>
              </div>
              <div>
                <div className="text-gray-500">Справочник организаций</div>
                <div className="font-medium">{selected.organization?.name ?? '—'}</div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-gray-800">Место практики (из анкеты)</h4>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-500">Организация</div>
                  <div className="font-medium">{selected.placementOrgName ?? '—'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Адрес</div>
                  <div>{selected.placementOrgAddress ?? '—'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Контакты</div>
                  <div>
                    {selected.placementOrgEmail ?? '—'} · {selected.placementOrgPhone ?? '—'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Руководитель организации</div>
                  <div>
                    {selected.placementOrgHeadFio ?? '—'}, {selected.placementOrgHeadPosition ?? '—'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Ответственный за практику</div>
                  <div>
                    {selected.placementPracticeRespFio ?? '—'}, {selected.placementPracticeRespPosition ?? '—'},{' '}
                    {selected.placementPracticeRespPhone ?? ''}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Руководитель на месте практики</div>
                  <div>{selected.placementOrgSupervisorFio ?? '—'}</div>
                </div>
                {selected.placementMetroMin != null && (
                  <div>
                    <div className="text-gray-500">До метро (мин.)</div>
                    <div>{selected.placementMetroMin}</div>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <div className="text-gray-500">Период практики (по анкете)</div>
                  <div>
                    {selected.placementPeriodStart
                      ? format(new Date(selected.placementPeriodStart), 'dd.MM.yyyy', { locale: ru })
                      : '—'}{' '}
                    —{' '}
                    {selected.placementPeriodEnd
                      ? format(new Date(selected.placementPeriodEnd), 'dd.MM.yyyy', { locale: ru })
                      : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Модуль</div>
                  <div className="font-mono text-xs">{selected.placementModuleIndex ?? '—'}</div>
                  <div>{selected.placementModuleName ?? '—'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Практика</div>
                  <div className="font-mono text-xs">{selected.placementPracticeIndex ?? '—'}</div>
                  <div>{selected.placementPracticeName ?? '—'}</div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-gray-500">Руководитель от техникума</div>
                  <div>
                    {selected.placementTechSupervisorFio ?? '—'}, {selected.placementTechSupervisorPosition ?? '—'},{' '}
                    {selected.placementTechSupervisorPhone ?? ''}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="label">Причина отклонения (при отклонении)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="input min-h-[88px]"
                placeholder="Укажите, что нужно исправить…"
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                className="btn-primary inline-flex items-center gap-2"
                disabled={reviewMutation.isPending}
                onClick={() => reviewMutation.mutate({ userId: selected.userId, decision: 'approve' })}
              >
                <Check size={16} />
                Подтвердить
              </button>
              <button
                type="button"
                className="btn-secondary inline-flex items-center gap-2 border-red-200 text-red-700 hover:bg-red-50"
                disabled={reviewMutation.isPending}
                onClick={() => {
                  if (!rejectReason.trim()) {
                    toast.error('Укажите причину отклонения');
                    return;
                  }
                  reviewMutation.mutate({
                    userId: selected.userId,
                    decision: 'reject',
                    rejectionReason: rejectReason.trim(),
                  });
                }}
              >
                <X size={16} />
                Отклонить
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
