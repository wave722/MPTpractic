import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { BookOpen, Plus, Pencil, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { practicesApi, modulesApi } from '@/api';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/auth';
import type { Practice, Module } from '@/types';
import toast from 'react-hot-toast';

interface PracticeForm {
  practiceIndex: string;
  practiceName: string;
  moduleId: number;
  periodStart: string;
  periodEnd: string;
}

export function PracticesPage() {
  const qc = useQueryClient();
  const { isAdmin, isMethodist } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Practice | null>(null);
  const [deleteItem, setDeleteItem] = useState<Practice | null>(null);

  const { data: practices = [], isLoading } = useQuery<Practice[]>({
    queryKey: ['practices'],
    queryFn: () => practicesApi.getAll().then((r) => r.data),
  });

  const { data: modules = [] } = useQuery<Module[]>({
    queryKey: ['modules'],
    queryFn: () => modulesApi.getAll().then((r) => r.data),
  });

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<PracticeForm>();
  const periodStart = watch('periodStart');

  const createMut = useMutation({
    mutationFn: practicesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['practices'] }); toast.success('Практика создана'); closeModal(); },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Ошибка создания'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PracticeForm> }) => practicesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['practices'] }); toast.success('Практика обновлена'); closeModal(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => practicesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['practices'] }); toast.success('Практика удалена'); setDeleteItem(null); },
    onError: () => toast.error('Невозможно удалить — есть назначения студентов'),
  });

  const closeModal = () => { setModalOpen(false); setEditItem(null); reset(); };
  const openEdit = (p: Practice) => {
    setEditItem(p);
    reset({
      practiceIndex: p.practiceIndex,
      practiceName: p.practiceName,
      moduleId: p.moduleId,
      periodStart: p.periodStart.split('T')[0],
      periodEnd: p.periodEnd.split('T')[0],
    });
    setModalOpen(true);
  };

  const onSubmit = (form: PracticeForm) => {
    const data = { ...form, moduleId: Number(form.moduleId) };
    if (editItem) updateMut.mutate({ id: editItem.id, data });
    else createMut.mutate(data);
  };

  const activeModules = modules.filter((m) => !m.archived);

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Справочник практик"
        subtitle={`${practices.length} записей`}
        icon={<BookOpen size={20} />}
        actions={
          isMethodist() && (
            <button onClick={() => { setEditItem(null); reset(); setModalOpen(true); }} className="btn-primary">
              <Plus size={16} /> Добавить практику
            </button>
          )
        }
      />

      <div className="card">
        <div className="table-wrap rounded-xl border-none">
          <table className="table">
            <thead>
              <tr>
                <th>Индекс ПП</th>
                <th>Название практики</th>
                <th>Модуль</th>
                <th>Период</th>
                {(isMethodist() || isAdmin()) && <th className="text-right">Действия</th>}
              </tr>
            </thead>
            <tbody>
              {practices.map((p) => (
                <tr key={p.id}>
                  <td><span className="badge badge-blue font-mono">{p.practiceIndex}</span></td>
                  <td className="font-medium">{p.practiceName}</td>
                  <td>
                    <div className="text-xs">
                      <span className="badge badge-gray mr-1">{p.module.moduleIndex}</span>
                      {p.module.moduleName}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Calendar size={13} className="text-gray-400" />
                      {format(new Date(p.periodStart), 'dd.MM.yyyy', { locale: ru })}
                      {' — '}
                      {format(new Date(p.periodEnd), 'dd.MM.yyyy', { locale: ru })}
                    </div>
                  </td>
                  {(isMethodist() || isAdmin()) && (
                    <td>
                      <div className="flex items-center gap-1 justify-end">
                        {isMethodist() && (
                          <button onClick={() => openEdit(p)} className="btn-ghost p-1.5">
                            <Pencil size={14} />
                          </button>
                        )}
                        {isAdmin() && (
                          <button onClick={() => setDeleteItem(p)} className="btn-ghost p-1.5 text-red-500">
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
          {practices.length === 0 && (
            <EmptyState icon={BookOpen} title="Нет практик" description="Добавьте первую практику" />
          )}
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={closeModal} title={editItem ? 'Редактировать практику' : 'Новая практика'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Индекс ПП" error={errors.practiceIndex?.message} required>
              <input
                {...register('practiceIndex', { required: 'Обязательное поле' })}
                className={`input font-mono ${errors.practiceIndex ? 'input-error' : ''}`}
                placeholder="ПП.01.01"
              />
            </FormField>
            <FormField label="Модуль" error={errors.moduleId?.message} required>
              <select
                {...register('moduleId', { required: 'Выберите модуль' })}
                className={`input ${errors.moduleId ? 'input-error' : ''}`}
              >
                <option value="">Выберите модуль</option>
                {activeModules.map((m) => (
                  <option key={m.id} value={m.id}>{m.moduleIndex} — {m.moduleName}</option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="Название практики" error={errors.practiceName?.message} required>
            <input
              {...register('practiceName', { required: 'Обязательное поле' })}
              className={`input ${errors.practiceName ? 'input-error' : ''}`}
              placeholder="Производственная практика"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Дата начала" error={errors.periodStart?.message} required>
              <input
                {...register('periodStart', { required: 'Обязательное поле' })}
                type="date"
                className={`input ${errors.periodStart ? 'input-error' : ''}`}
              />
            </FormField>
            <FormField
              label="Дата окончания"
              error={errors.periodEnd?.message}
              required
              hint="Дата окончания не может быть раньше даты начала"
            >
              <input
                {...register('periodEnd', {
                  required: 'Обязательное поле',
                  validate: (v) => !periodStart || v >= periodStart || 'Дата окончания раньше даты начала',
                })}
                type="date"
                min={periodStart}
                className={`input ${errors.periodEnd ? 'input-error' : ''}`}
              />
            </FormField>
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
            Период практики единый для всех групп в рамках данной практики.
          </p>
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
        title="Удалить практику?"
        message={`Удалить практику "${deleteItem?.practiceName}"? Все связанные назначения будут удалены.`}
        loading={deleteMut.isPending}
      />
    </div>
  );
}
