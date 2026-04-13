import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { BookMarked, Plus, Pencil, Trash2, Archive } from 'lucide-react';
import { modulesApi } from '@/api';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/auth';
import type { Module } from '@/types';
import toast from 'react-hot-toast';

interface ModuleForm { moduleIndex: string; moduleName: string; }

export function ModulesPage() {
  const qc = useQueryClient();
  const { isAdmin, isMethodist } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Module | null>(null);
  const [deleteItem, setDeleteItem] = useState<Module | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const { data = [], isLoading } = useQuery<Module[]>({
    queryKey: ['modules'],
    queryFn: () => modulesApi.getAll().then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ModuleForm>();

  const createMut = useMutation({
    mutationFn: modulesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['modules'] }); toast.success('Модуль создан'); closeModal(); },
    onError: () => toast.error('Модуль с таким индексом уже существует'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ModuleForm }) => modulesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['modules'] }); toast.success('Модуль обновлён'); closeModal(); },
  });

  const archiveMut = useMutation({
    mutationFn: (id: number) => modulesApi.archive(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['modules'] }); toast.success('Модуль архивирован'); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => modulesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['modules'] }); toast.success('Модуль удалён'); setDeleteItem(null); },
    onError: () => toast.error('Невозможно удалить модуль — есть связанные практики'),
  });

  const closeModal = () => { setModalOpen(false); setEditItem(null); reset(); };
  const openEdit = (m: Module) => { setEditItem(m); reset({ moduleIndex: m.moduleIndex, moduleName: m.moduleName }); setModalOpen(true); };
  const openCreate = () => { setEditItem(null); reset(); setModalOpen(true); };

  const onSubmit = (form: ModuleForm) => {
    if (editItem) updateMut.mutate({ id: editItem.id, data: form });
    else createMut.mutate(form);
  };

  const filtered = data.filter((m) => showArchived || !m.archived);

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Справочник модулей"
        subtitle={`${filtered.length} записей`}
        icon={<BookMarked size={20} />}
        actions={
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="rounded" />
              Показать архивные
            </label>
            {isMethodist() && (
              <button onClick={openCreate} className="btn-primary">
                <Plus size={16} /> Добавить модуль
              </button>
            )}
          </div>
        }
      />

      <div className="card">
        <div className="table-wrap rounded-xl border-none">
          <table className="table">
            <thead>
              <tr>
                <th>Индекс</th>
                <th>Наименование</th>
                <th>Статус</th>
                <th className="text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td><span className="badge badge-blue font-mono">{m.moduleIndex}</span></td>
                  <td className="font-medium">{m.moduleName}</td>
                  <td>
                    {m.archived
                      ? <span className="badge badge-gray">Архивный</span>
                      : <span className="badge badge-green">Активный</span>
                    }
                  </td>
                  <td>
                    <div className="flex items-center gap-1 justify-end">
                      {isMethodist() && (
                        <button onClick={() => openEdit(m)} className="btn-ghost p-1.5">
                          <Pencil size={14} />
                        </button>
                      )}
                      {isAdmin() && !m.archived && (
                        <button onClick={() => archiveMut.mutate(m.id)} className="btn-ghost p-1.5 text-yellow-600">
                          <Archive size={14} />
                        </button>
                      )}
                      {isAdmin() && (
                        <button onClick={() => setDeleteItem(m)} className="btn-ghost p-1.5 text-red-500">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <EmptyState icon={BookMarked} title="Нет модулей" description="Добавьте первый модуль" />
          )}
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={closeModal} title={editItem ? 'Редактировать модуль' : 'Новый модуль'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Индекс модуля" error={errors.moduleIndex?.message} required>
            <input
              {...register('moduleIndex', { required: 'Индекс обязателен' })}
              className={`input font-mono ${errors.moduleIndex ? 'input-error' : ''}`}
              placeholder="МДК.01.01"
            />
          </FormField>
          <FormField label="Наименование" error={errors.moduleName?.message} required>
            <input
              {...register('moduleName', { required: 'Наименование обязательно' })}
              className={`input ${errors.moduleName ? 'input-error' : ''}`}
              placeholder="Название модуля"
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
        title="Удалить модуль?"
        message={`Вы уверены, что хотите удалить модуль "${deleteItem?.moduleName}"? Это действие необратимо.`}
        loading={deleteMut.isPending}
      />
    </div>
  );
}
