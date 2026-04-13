import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { UserCheck, Plus, Pencil, Trash2, Phone, Briefcase, Users } from 'lucide-react';
import { techSupervisorsApi, analyticsApi } from '@/api';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/auth';
import type { TechSupervisor, SupervisorLoad } from '@/types';
import toast from 'react-hot-toast';

interface SupForm { fio: string; position: string; phone: string; }

export function TechSupervisorsPage() {
  const qc = useQueryClient();
  const { isAdmin, isMethodist } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<TechSupervisor | null>(null);
  const [deleteItem, setDeleteItem] = useState<TechSupervisor | null>(null);

  const { data = [], isLoading } = useQuery<TechSupervisor[]>({
    queryKey: ['tech-supervisors'],
    queryFn: () => techSupervisorsApi.getAll().then((r) => r.data),
  });

  const { data: loadData = [] } = useQuery<SupervisorLoad[]>({
    queryKey: ['supervisor-load'],
    queryFn: () => analyticsApi.getSupervisorLoad().then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SupForm>();

  const createMut = useMutation({
    mutationFn: techSupervisorsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tech-supervisors'] }); qc.invalidateQueries({ queryKey: ['supervisor-load'] }); toast.success('Руководитель добавлен'); closeModal(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SupForm }) => techSupervisorsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tech-supervisors'] }); toast.success('Данные обновлены'); closeModal(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => techSupervisorsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tech-supervisors'] }); toast.success('Руководитель удалён'); setDeleteItem(null); },
    onError: () => toast.error('Невозможно удалить — есть назначения студентов'),
  });

  const closeModal = () => { setModalOpen(false); setEditItem(null); reset(); };

  const onSubmit = (form: SupForm) => {
    if (editItem) updateMut.mutate({ id: editItem.id, data: form });
    else createMut.mutate(form);
  };

  const loadMap = new Map(loadData.map((s) => [s.id, s]));

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Руководители ПП от техникума"
        subtitle={`${data.length} руководителей`}
        icon={<UserCheck size={20} />}
        actions={
          isMethodist() && (
            <button onClick={() => { setEditItem(null); reset(); setModalOpen(true); }} className="btn-primary">
              <Plus size={16} /> Добавить
            </button>
          )
        }
      />

      <div className="grid gap-4">
        {data.map((s) => {
          const load = loadMap.get(s.id);
          return (
            <div key={s.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-primary-700">
                    {s.fio.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{s.fio}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Briefcase size={13} className="text-gray-400" />
                        {s.position}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone size={13} className="text-gray-400" />
                        {s.phone}
                      </span>
                    </div>
                    {load && (
                      <div className="mt-2 flex items-center gap-3 flex-wrap">
                        <span className={`badge ${load.studentCount > 10 ? 'badge-red' : load.studentCount > 5 ? 'badge-yellow' : 'badge-green'}`}>
                          <Users size={11} className="mr-1" />
                          {load.studentCount} студентов
                        </span>
                        {load.organizations.map((o) => (
                          <span key={o.id} className="badge badge-blue">{o.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isMethodist() && (
                    <button
                      onClick={() => { setEditItem(s); reset({ fio: s.fio, position: s.position, phone: s.phone }); setModalOpen(true); }}
                      className="btn-ghost p-2"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                  {isAdmin() && (
                    <button onClick={() => setDeleteItem(s)} className="btn-ghost p-2 text-red-500">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {data.length === 0 && (
          <div className="card">
            <EmptyState icon={UserCheck} title="Нет руководителей" description="Добавьте первого руководителя ПП" />
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={closeModal} title={editItem ? 'Редактировать руководителя' : 'Новый руководитель ПП'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="ФИО" error={errors.fio?.message} required>
            <input {...register('fio', { required: 'Обязательное поле' })} className={`input ${errors.fio ? 'input-error' : ''}`} placeholder="Фамилия Имя Отчество" />
          </FormField>
          <FormField label="Должность" error={errors.position?.message} required>
            <input {...register('position', { required: 'Обязательное поле' })} className={`input ${errors.position ? 'input-error' : ''}`} placeholder="Преподаватель" />
          </FormField>
          <FormField label="Контактный телефон" error={errors.phone?.message} required>
            <input {...register('phone', { required: 'Обязательное поле' })} className={`input ${errors.phone ? 'input-error' : ''}`} placeholder="+7 (926) 000-00-00" />
          </FormField>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary">Отмена</button>
            <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="btn-primary">
              {editItem ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => deleteItem && deleteMut.mutate(deleteItem.id)}
        title="Удалить руководителя?"
        message={`Удалить "${deleteItem?.fio}"? Это действие необратимо.`}
        loading={deleteMut.isPending}
      />
    </div>
  );
}
