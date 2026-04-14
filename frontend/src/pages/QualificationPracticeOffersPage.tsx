import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarRange, Plus, Pencil, Trash2 } from 'lucide-react';
import { qualificationPracticeOffersApi, groupIndexLabelsApi, practicesApi } from '@/api';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/auth';
import type { QualificationPracticeOffer, Practice } from '@/types';
import { toDateInput } from '@/lib/studentProfilePayload';
import toast from 'react-hot-toast';

type ModalForm = {
  groupIndexLabelId: string;
  practiceId: string;
  periodStart: string;
  periodEnd: string;
  note: string;
};

const emptyForm = (): ModalForm => ({
  groupIndexLabelId: '',
  practiceId: '',
  periodStart: '',
  periodEnd: '',
  note: '',
});

export function QualificationPracticeOffersPage() {
  const qc = useQueryClient();
  const { isMethodist } = useAuthStore();
  const [labelFilter, setLabelFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<QualificationPracticeOffer | null>(null);
  const [deleteItem, setDeleteItem] = useState<QualificationPracticeOffer | null>(null);
  const [form, setForm] = useState<ModalForm>(emptyForm);

  const { data: labels = [], isLoading: labelsLoading } = useQuery({
    queryKey: ['group-index-labels'],
    queryFn: () => groupIndexLabelsApi.getAll(),
  });

  const { data: practices = [], isLoading: practicesLoading } = useQuery<Practice[]>({
    queryKey: ['practices'],
    queryFn: () => practicesApi.getAll().then((r) => r.data),
  });

  const { data: offers = [], isLoading: offersLoading } = useQuery({
    queryKey: ['qualification-practice-offers', labelFilter],
    queryFn: () =>
      qualificationPracticeOffersApi.getAll(
        labelFilter ? { groupIndexLabelId: Number(labelFilter) } : undefined
      ),
  });

  useEffect(() => {
    if (!modalOpen) return;
    if (editItem) {
      setForm({
        groupIndexLabelId: String(editItem.groupIndexLabelId),
        practiceId: String(editItem.practiceId),
        periodStart: toDateInput(editItem.periodStart),
        periodEnd: toDateInput(editItem.periodEnd),
        note: editItem.note ?? '',
      });
    } else {
      setForm({
        ...emptyForm(),
        groupIndexLabelId: labelFilter || '',
      });
    }
  }, [modalOpen, editItem, labelFilter]);

  const invalidateLists = () => {
    qc.invalidateQueries({ queryKey: ['qualification-practice-offers'] });
    qc.invalidateQueries({ queryKey: ['student-practice-offers'] });
  };

  const createMut = useMutation({
    mutationFn: (body: {
      groupIndexLabelId: number;
      practiceId: number;
      periodStart: string;
      periodEnd: string;
      note?: string;
    }) => qualificationPracticeOffersApi.create(body),
    onSuccess: () => {
      invalidateLists();
      toast.success('Добавлено');
      closeModal();
    },
    onError: () => toast.error('Не удалось сохранить'),
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        groupIndexLabelId: number;
        practiceId: number;
        periodStart: string;
        periodEnd: string;
        note: string;
      };
    }) => qualificationPracticeOffersApi.update(id, data),
    onSuccess: () => {
      invalidateLists();
      toast.success('Сохранено');
      closeModal();
    },
    onError: () => toast.error('Не удалось сохранить'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => qualificationPracticeOffersApi.delete(id),
    onSuccess: () => {
      invalidateLists();
      toast.success('Удалено');
      setDeleteItem(null);
    },
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditItem(null);
    setForm(emptyForm());
  };

  const openCreate = () => {
    setEditItem(null);
    setModalOpen(true);
  };

  const openEdit = (row: QualificationPracticeOffer) => {
    setEditItem(row);
    setModalOpen(true);
  };

  const onSubmitModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.groupIndexLabelId || !form.practiceId || !form.periodStart || !form.periodEnd) {
      toast.error('Заполните квалификацию, практику и даты');
      return;
    }
    const body = {
      groupIndexLabelId: Number(form.groupIndexLabelId),
      practiceId: Number(form.practiceId),
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      note: form.note.trim(),
    };
    if (editItem) updateMut.mutate({ id: editItem.id, data: body });
    else createMut.mutate(body);
  };

  if (labelsLoading || practicesLoading || offersLoading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Практики по квалификациям"
        subtitle="Варианты с датами для каждого направления (как в графиках). Студент увидит их после выбора группы в анкете."
        icon={<CalendarRange size={20} />}
        actions={
          isMethodist() && (
            <button type="button" onClick={openCreate} className="btn-primary">
              <Plus size={16} /> Добавить вариант
            </button>
          )
        }
      />

      <div className="card p-4 mb-4 flex flex-wrap items-end gap-4">
        <div className="min-w-[220px] flex-1 sm:flex-none">
          <label className="label">Фильтр по квалификации</label>
          <select
            value={labelFilter}
            onChange={(e) => setLabelFilter(e.target.value)}
            className="input"
          >
            <option value="">Все направления</option>
            {labels.map((l) => (
              <option key={l.id} value={String(l.id)}>
                {l.exportLabel}
              </option>
            ))}
          </select>
        </div>
        {labels.length === 0 && (
          <p className="text-sm text-amber-700">
            Сначала добавьте записи в разделе «Коды индексов».
          </p>
        )}
        {practices.length === 0 && (
          <p className="text-sm text-amber-700">
            В справочнике нет практик — сначала заведите их во вкладке «Практики» (при необходимости — модуль во вкладке
            «Модули»).
          </p>
        )}
      </div>

      <div className="card">
        <div className="table-wrap rounded-xl border-none">
          <table className="table">
            <thead>
              <tr>
                <th>Квалификация</th>
                <th>Практика</th>
                <th>Период</th>
                <th>Примечание</th>
                {isMethodist() && <th className="text-right">Действия</th>}
              </tr>
            </thead>
            <tbody>
              {offers.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="font-medium text-gray-900">
                      {row.groupIndexLabel?.exportLabel ?? '—'}
                    </div>
                    <div className="text-xs text-gray-500">{row.groupIndexLabel?.indexKey}</div>
                  </td>
                  <td>
                    <span className="font-mono text-sm">{row.practice?.practiceIndex}</span>
                    <div className="text-sm text-gray-700">{row.practice?.practiceName}</div>
                    <div className="text-xs text-gray-500">
                      {row.practice?.module?.moduleIndex} {row.practice?.module?.moduleName}
                    </div>
                  </td>
                  <td className="text-sm whitespace-nowrap">
                    {toDateInput(row.periodStart)} — {toDateInput(row.periodEnd)}
                  </td>
                  <td className="text-sm text-gray-600">{row.note || '—'}</td>
                  {isMethodist() && (
                    <td>
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="btn-ghost p-1.5"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteItem(row)}
                          className="btn-ghost p-1.5 text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {offers.length === 0 && (
            <EmptyState
              icon={CalendarRange}
              title="Нет записей"
              description="Добавьте варианты практик с датами для нужных квалификаций."
            />
          )}
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editItem ? 'Изменить вариант' : 'Новый вариант практики'}
        size="lg"
      >
        <form onSubmit={onSubmitModal} className="space-y-4">
          <FormField label="Квалификация (направление)" required>
            <select
              className="input"
              value={form.groupIndexLabelId}
              onChange={(e) => setForm((f) => ({ ...f, groupIndexLabelId: e.target.value }))}
            >
              <option value="">Выберите квалификацию…</option>
              {labels.map((l) => (
                <option key={l.id} value={String(l.id)}>
                  {l.exportLabel}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label="Практика из справочника"
            required
            hint="Тот же список, что на вкладке «Практики» (учебный план)."
          >
            <select
              className="input"
              value={form.practiceId}
              onChange={(e) => setForm((f) => ({ ...f, practiceId: e.target.value }))}
            >
              <option value="">Выберите практику…</option>
              {practices.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.practiceIndex} — {p.practiceName} · {p.module.moduleIndex} {p.module.moduleName}
                </option>
              ))}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Дата начала" required>
              <input
                type="date"
                className="input"
                value={form.periodStart}
                onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
              />
            </FormField>
            <FormField label="Дата окончания" required>
              <input
                type="date"
                className="input"
                value={form.periodEnd}
                onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
              />
            </FormField>
          </div>
          <FormField label="Примечание (необязательно)" hint="Например: 1-й семестр, группы П50…">
            <input
              className="input"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </FormField>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary">
              Отмена
            </button>
            <button
              type="submit"
              disabled={createMut.isPending || updateMut.isPending}
              className="btn-primary"
            >
              {editItem ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => deleteItem && deleteMut.mutate(deleteItem.id)}
        title="Удалить вариант?"
        message="Студенты больше не увидят этот вариант в анкете."
        loading={deleteMut.isPending}
      />
    </div>
  );
}
