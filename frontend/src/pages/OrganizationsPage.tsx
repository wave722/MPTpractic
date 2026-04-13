import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Building2, Plus, Pencil, Trash2, MapPin, Clock, Mail, Phone } from 'lucide-react';
import { organizationsApi } from '@/api';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/auth';
import type { Organization } from '@/types';
import toast from 'react-hot-toast';

type OrgForm = Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>;

export function OrganizationsPage() {
  const qc = useQueryClient();
  const { isAdmin, isMethodist } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Organization | null>(null);
  const [deleteItem, setDeleteItem] = useState<Organization | null>(null);
  const [search, setSearch] = useState('');

  const { data = [], isLoading } = useQuery<Organization[]>({
    queryKey: ['organizations'],
    queryFn: () => organizationsApi.getAll().then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<OrgForm>();

  const createMut = useMutation({
    mutationFn: organizationsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organizations'] }); toast.success('Организация добавлена'); closeModal(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<OrgForm> }) => organizationsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organizations'] }); toast.success('Организация обновлена'); closeModal(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => organizationsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organizations'] }); toast.success('Организация удалена'); setDeleteItem(null); },
    onError: () => toast.error('Невозможно удалить — есть назначения студентов'),
  });

  const closeModal = () => { setModalOpen(false); setEditItem(null); reset(); };
  const openEdit = (o: Organization) => {
    setEditItem(o);
    reset(o);
    setModalOpen(true);
  };
  const openCreate = () => { setEditItem(null); reset(); setModalOpen(true); };

  const onSubmit = (form: OrgForm) => {
    const data = { ...form, timeToNearestMetroMin: Number(form.timeToNearestMetroMin) };
    if (editItem) updateMut.mutate({ id: editItem.id, data });
    else createMut.mutate(data);
  };

  const filtered = data.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.address.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Справочник организаций"
        subtitle={`${filtered.length} организаций`}
        icon={<Building2 size={20} />}
        actions={
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию..."
              className="input w-56"
            />
            {isMethodist() && (
              <button onClick={openCreate} className="btn-primary">
                <Plus size={16} /> Добавить
              </button>
            )}
          </div>
        }
      />

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={Building2} title="Организации не найдены" description="Добавьте первую организацию" />
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((o) => (
            <div key={o.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge badge-gray text-xs">#{o.id}</span>
                    <h3 className="font-semibold text-gray-900">{o.name}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <MapPin size={13} className="text-gray-400 shrink-0" />
                      {o.address}
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Clock size={13} className="text-gray-400 shrink-0" />
                      {o.timeToNearestMetroMin} мин до метро/МЦД
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Mail size={13} className="text-gray-400 shrink-0" />
                      {o.email}
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Phone size={13} className="text-gray-400 shrink-0" />
                      {o.phone}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-gray-400 uppercase tracking-wide">Руководитель</span>
                      <p className="font-medium text-gray-800">{o.supervisorOrgFio}</p>
                      <p className="text-gray-500 text-xs">{o.supervisorOrgPosition}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 uppercase tracking-wide">Ответственный за ПП</span>
                      <p className="font-medium text-gray-800">{o.practiceResponsibleFio}</p>
                      <p className="text-gray-500 text-xs">{o.practiceResponsiblePosition} · {o.practiceResponsiblePhone}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  {isMethodist() && (
                    <button onClick={() => openEdit(o)} className="btn-ghost p-2">
                      <Pencil size={15} />
                    </button>
                  )}
                  {isAdmin() && (
                    <button onClick={() => setDeleteItem(o)} className="btn-ghost p-2 text-red-500">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={closeModal} title={editItem ? 'Редактировать организацию' : 'Новая организация'} size="xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Название организации" error={errors.name?.message} required>
            <input {...register('name', { required: 'Обязательное поле' })} className={`input ${errors.name ? 'input-error' : ''}`} placeholder='ООО "Название"' />
          </FormField>
          <FormField label="Адрес" error={errors.address?.message} required>
            <input {...register('address', { required: 'Обязательное поле' })} className={`input ${errors.address ? 'input-error' : ''}`} placeholder="г. Москва, ул. ..." />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email" error={errors.email?.message} required>
              <input {...register('email', { required: 'Обязательное поле', pattern: { value: /\S+@\S+\.\S+/, message: 'Некорректный email' } })} type="email" className={`input ${errors.email ? 'input-error' : ''}`} placeholder="info@company.ru" />
            </FormField>
            <FormField label="Телефон организации" error={errors.phone?.message} required>
              <input {...register('phone', { required: 'Обязательное поле' })} className={`input ${errors.phone ? 'input-error' : ''}`} placeholder="+7 (495) 000-00-00" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="ФИО руководителя от организации" error={errors.supervisorOrgFio?.message} required>
              <input {...register('supervisorOrgFio', { required: 'Обязательное поле' })} className={`input ${errors.supervisorOrgFio ? 'input-error' : ''}`} placeholder="Фамилия Имя Отчество" />
            </FormField>
            <FormField label="Должность руководителя" error={errors.supervisorOrgPosition?.message} required>
              <input {...register('supervisorOrgPosition', { required: 'Обязательное поле' })} className={`input ${errors.supervisorOrgPosition ? 'input-error' : ''}`} placeholder="Генеральный директор" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="ФИО ответственного за ПП" error={errors.practiceResponsibleFio?.message} required>
              <input {...register('practiceResponsibleFio', { required: 'Обязательное поле' })} className={`input ${errors.practiceResponsibleFio ? 'input-error' : ''}`} placeholder="Фамилия Имя Отчество" />
            </FormField>
            <FormField label="Должность ответственного" error={errors.practiceResponsiblePosition?.message} required>
              <input {...register('practiceResponsiblePosition', { required: 'Обязательное поле' })} className={`input ${errors.practiceResponsiblePosition ? 'input-error' : ''}`} placeholder="HR-менеджер" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Телефон ответственного" error={errors.practiceResponsiblePhone?.message} required>
              <input {...register('practiceResponsiblePhone', { required: 'Обязательное поле' })} className={`input ${errors.practiceResponsiblePhone ? 'input-error' : ''}`} placeholder="+7 (495) 000-00-00" />
            </FormField>
            <FormField label="Время до метро/МЦД (мин.)" error={errors.timeToNearestMetroMin?.message} required hint="Целое число от 1 до 180">
              <input
                {...register('timeToNearestMetroMin', {
                  required: 'Обязательное поле',
                  min: { value: 1, message: 'Минимум 1 минута' },
                  max: { value: 180, message: 'Максимум 180 минут' },
                  valueAsNumber: true,
                })}
                type="number"
                min={1}
                max={180}
                className={`input ${errors.timeToNearestMetroMin ? 'input-error' : ''}`}
                placeholder="10"
              />
            </FormField>
          </div>
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
        title="Удалить организацию?"
        message={`Удалить организацию "${deleteItem?.name}"? Все связанные назначения будут удалены.`}
        loading={deleteMut.isPending}
      />
    </div>
  );
}
