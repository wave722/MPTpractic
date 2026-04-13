import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Tag, Plus, Pencil, Trash2 } from 'lucide-react';
import { groupIndexLabelsApi } from '@/api';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/auth';
import type { GroupIndexLabel } from '@/types';
import toast from 'react-hot-toast';

export function GroupIndexLabelsPage() {
  const qc = useQueryClient();
  const { isMethodist } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<GroupIndexLabel | null>(null);
  const [deleteItem, setDeleteItem] = useState<GroupIndexLabel | null>(null);

  const { data = [], isLoading } = useQuery<GroupIndexLabel[]>({
    queryKey: ['group-index-labels'],
    queryFn: () => groupIndexLabelsApi.getAll(),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    indexKey: string;
    exportLabel: string;
  }>();

  const createMut = useMutation({
    mutationFn: groupIndexLabelsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-index-labels'] });
      toast.success('Запись добавлена');
      closeModal();
    },
    onError: () => toast.error('Индекс уже занят'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { indexKey: string; exportLabel: string } }) =>
      groupIndexLabelsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-index-labels'] });
      toast.success('Сохранено');
      closeModal();
    },
    onError: () => toast.error('Не удалось сохранить — возможно, индекс занят'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => groupIndexLabelsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-index-labels'] });
      toast.success('Удалено');
      setDeleteItem(null);
    },
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditItem(null);
    reset();
  };

  const onSubmit = (form: { indexKey: string; exportLabel: string }) => {
    if (editItem) updateMut.mutate({ id: editItem.id, data: form });
    else createMut.mutate(form);
  };

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Коды индексов групп"
        subtitle="Как подписывать направление в отчётах: индекс из группы (П, ИСиП…) и полный текст для Excel, например 09.02.07 (П)"
        icon={<Tag size={20} />}
        actions={
          isMethodist() && (
            <button
              type="button"
              onClick={() => {
                setEditItem(null);
                reset({ indexKey: '', exportLabel: '' });
                setModalOpen(true);
              }}
              className="btn-primary"
            >
              <Plus size={16} /> Добавить
            </button>
          )
        }
      />

      <div className="card">
        <div className="table-wrap rounded-xl border-none">
          <table className="table">
            <thead>
              <tr>
                <th>Индекс</th>
                <th>Текст в выгрузке</th>
                {isMethodist() && <th className="text-right">Действия</th>}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className="badge badge-gray font-medium">{row.indexKey}</span>
                  </td>
                  <td className="text-gray-800">{row.exportLabel}</td>
                  {isMethodist() && (
                    <td>
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setEditItem(row);
                            reset({ indexKey: row.indexKey, exportLabel: row.exportLabel });
                            setModalOpen(true);
                          }}
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
          {data.length === 0 && (
            <EmptyState
              icon={Tag}
              title="Справочник пуст"
              description="Добавьте соответствия: индекс «П» → текст «09.02.07 (П)» и т.д. Без записи в отчётах остаётся сам индекс."
            />
          )}
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editItem ? 'Изменить запись' : 'Новая запись'}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            label="Индекс группы"
            hint="Как в системе: буквенный префикс до цифры (П, ИСиП, ВД…)"
            error={errors.indexKey?.message}
            required
          >
            <input
              {...register('indexKey', { required: 'Укажите индекс' })}
              className={`input ${errors.indexKey ? 'input-error' : ''}`}
              placeholder="П"
              autoComplete="off"
            />
          </FormField>
          <FormField
            label="Текст для отчётов"
            hint="Полностью, как должно быть в Excel и в списках на странице «Отчёты»"
            error={errors.exportLabel?.message}
            required
          >
            <input
              {...register('exportLabel', { required: 'Укажите текст' })}
              className={`input ${errors.exportLabel ? 'input-error' : ''}`}
              placeholder="09.02.07 (П)"
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
        title="Удалить запись?"
        message={`Удалить соответствие «${deleteItem?.indexKey}» → «${deleteItem?.exportLabel}»?`}
        loading={deleteMut.isPending}
      />
    </div>
  );
}
