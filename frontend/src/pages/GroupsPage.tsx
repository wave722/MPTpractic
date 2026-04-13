import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Users, Plus, Pencil, Trash2 } from 'lucide-react';
import { groupsApi } from '@/api';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/auth';
import type { Group } from '@/types';
import toast from 'react-hot-toast';

export function GroupsPage() {
  const qc = useQueryClient();
  const { isAdmin, isMethodist } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Group | null>(null);
  const [deleteItem, setDeleteItem] = useState<Group | null>(null);

  const { data = [], isLoading } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: () => groupsApi.getAll().then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ groupName: string; groupIndex: string }>();

  const createMut = useMutation({
    mutationFn: groupsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['groups'] }); toast.success('Группа создана'); closeModal(); },
    onError: () => toast.error('Группа с таким названием уже существует'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { groupName: string; groupIndex: string } }) =>
      groupsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['groups'] }); toast.success('Группа обновлена'); closeModal(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => groupsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['groups'] }); toast.success('Группа удалена'); setDeleteItem(null); },
    onError: () => toast.error('Невозможно удалить — в группе есть студенты'),
  });

  const closeModal = () => { setModalOpen(false); setEditItem(null); reset(); };

  const onSubmit = (form: { groupName: string; groupIndex: string }) => {
    if (editItem) updateMut.mutate({ id: editItem.id, data: form });
    else createMut.mutate(form);
  };

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Справочник групп"
        subtitle={`${data.length} групп`}
        icon={<Users size={20} />}
        actions={
          isMethodist() && (
            <button
              onClick={() => {
                setEditItem(null);
                reset({ groupName: '', groupIndex: '' });
                setModalOpen(true);
              }}
              className="btn-primary"
            >
              <Plus size={16} /> Добавить группу
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
                <th>Название группы</th>
                <th className="text-center">Студентов</th>
                {(isMethodist() || isAdmin()) && <th className="text-right">Действия</th>}
              </tr>
            </thead>
            <tbody>
              {data.map((g) => (
                <tr key={g.id}>
                  <td>
                    <span className="badge badge-gray font-medium">{g.groupIndex || '—'}</span>
                  </td>
                  <td className="font-medium">{g.groupName}</td>
                  <td className="text-center">
                    <span className="badge badge-blue">{g._count?.students ?? 0}</span>
                  </td>
                  {(isMethodist() || isAdmin()) && (
                    <td>
                      <div className="flex items-center gap-1 justify-end">
                        {isMethodist() && (
                          <button
                            onClick={() => {
                              setEditItem(g);
                              reset({ groupName: g.groupName, groupIndex: g.groupIndex || '' });
                              setModalOpen(true);
                            }}
                            className="btn-ghost p-1.5"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {isAdmin() && (
                          <button onClick={() => setDeleteItem(g)} className="btn-ghost p-1.5 text-red-500">
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
          {data.length === 0 && (
            <EmptyState icon={Users} title="Нет групп" description="Добавьте первую группу" />
          )}
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={closeModal} title={editItem ? 'Редактировать группу' : 'Новая группа'} size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            label="Индекс группы"
            hint="Направление: Э, П, ИП — как в начале названия до дефиса"
            error={errors.groupIndex?.message}
            required
          >
            <input
              {...register('groupIndex', { required: 'Укажите индекс (например Э или П)' })}
              className={`input ${errors.groupIndex ? 'input-error' : ''}`}
              placeholder="Э"
              list="group-index-presets"
              autoComplete="off"
            />
            <datalist id="group-index-presets">
              <option value="Э" />
              <option value="П" />
              <option value="ИП" />
              <option value="ИСиП" />
              <option value="К" />
            </datalist>
          </FormField>
          <FormField label="Название группы" error={errors.groupName?.message} required>
            <input
              {...register('groupName', { required: 'Обязательное поле' })}
              className={`input ${errors.groupName ? 'input-error' : ''}`}
              placeholder="Э-1-22 или ИП-31"
            />
          </FormField>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary">Отмена</button>
            <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="btn-primary">
              {editItem ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => deleteItem && deleteMut.mutate(deleteItem.id)}
        title="Удалить группу?"
        message={`Удалить группу "${deleteItem?.groupName}"?`}
        loading={deleteMut.isPending}
      />
    </div>
  );
}
