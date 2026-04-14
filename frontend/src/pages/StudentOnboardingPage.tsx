import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Send, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageLoader } from '@/components/ui/Spinner';
import { FormField } from '@/components/ui/FormField';
import { authApi, studentProfileApi } from '@/api';
import { useAuthStore } from '@/store/auth';
import { REVIEW_STATUS_LABEL, reviewStatusDescription } from '@/lib/studentProfileUi';
import type { ProfileReviewStatus } from '@/types';
import {
  type StudentAnketaFormValues,
  profileToFormDefaults,
  formValuesToPayload,
} from '@/lib/studentProfilePayload';
import { effectiveGroupIndex, groupsMatchingIndex } from '@/lib/groupIndex';
import { exportLabelForIndex, sortedAdminGroupIndexKeys } from '@/lib/groupIndexLabelDisplay';

function fmtRuYmd(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU');
}

async function refreshStudentAccess() {
  const { data } = await authApi.me();
  useAuthStore.setState({
    studentAccess: data.studentAccess ?? null,
  });
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2">{children}</h3>;
}

export function StudentOnboardingPage() {
  const queryClient = useQueryClient();
  const { studentAccess } = useAuthStore();

  const { data: lookups, isLoading: lookupsLoading } = useQuery({
    queryKey: ['student-profile-lookups'],
    queryFn: () => studentProfileApi.getLookups().then((r) => r.data),
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['student-profile-me'],
    queryFn: () => studentProfileApi.getMe().then((r) => r.data),
  });

  const formLocked = profile == null ? true : !profile.canEdit;

  const { register, handleSubmit, reset, setValue, control, formState: { errors } } =
    useForm<StudentAnketaFormValues>();

  const [anketaGroupIndex, setAnketaGroupIndex] = useState('');
  const [selectedScheduleOfferId, setSelectedScheduleOfferId] = useState('');
  const lastAppliedOfferId = useRef<string | null>(null);

  const groups = useMemo(() => lookups?.groups ?? [], [lookups?.groups]);
  const groupIndexLabels = useMemo(
    () => lookups?.groupIndexLabels ?? [],
    [lookups?.groupIndexLabels]
  );
  const anketaIndices = useMemo(() => sortedAdminGroupIndexKeys(groupIndexLabels), [groupIndexLabels]);
  const filteredAnketaGroups = useMemo(
    () => groupsMatchingIndex(groups, anketaGroupIndex),
    [groups, anketaGroupIndex]
  );

  const watchedGroupId = useWatch({ control, name: 'groupId' });

  const groupIdNum = watchedGroupId ? Number(watchedGroupId) : NaN;
  const { data: practiceOffersPayload } = useQuery({
    queryKey: ['student-practice-offers', watchedGroupId],
    queryFn: () => studentProfileApi.getPracticeOffers(groupIdNum),
    enabled: Boolean(watchedGroupId) && !Number.isNaN(groupIdNum),
  });

  useEffect(() => {
    setSelectedScheduleOfferId('');
    lastAppliedOfferId.current = null;
  }, [watchedGroupId]);

  useEffect(() => {
    if (formLocked) return;
    if (!selectedScheduleOfferId) {
      lastAppliedOfferId.current = null;
      return;
    }
    const o = practiceOffersPayload?.offers.find((x) => String(x.id) === selectedScheduleOfferId);
    if (!o) return;
    if (lastAppliedOfferId.current === selectedScheduleOfferId) return;
    lastAppliedOfferId.current = selectedScheduleOfferId;
    setValue('placementModuleIndex', o.practice.moduleIndex);
    setValue('placementModuleName', o.practice.moduleName);
    setValue('placementPracticeIndex', o.practice.practiceIndex);
    setValue('placementPracticeName', o.practice.practiceName);
    setValue('placementPeriodStart', o.periodStart);
    setValue('placementPeriodEnd', o.periodEnd);
  }, [selectedScheduleOfferId, practiceOffersPayload, formLocked, setValue]);

  useEffect(() => {
    if (!profile) return;
    reset(profileToFormDefaults(profile));
  }, [profile, reset]);

  useEffect(() => {
    if (!lookups?.groups?.length || !profile?.groupId) return;
    const g = lookups.groups.find((x) => x.id === profile.groupId);
    if (!g) return;
    const idx = effectiveGroupIndex(g);
    const allowed = new Set(sortedAdminGroupIndexKeys(groupIndexLabels));
    setAnketaGroupIndex(idx && allowed.has(idx) ? idx : '');
  }, [profile?.groupId, lookups?.groups, lookups?.groupIndexLabels]);

  useEffect(() => {
    if (!anketaGroupIndex.trim()) return;
    const ok = filteredAnketaGroups.some((g) => String(g.id) === String(watchedGroupId));
    if (watchedGroupId && !ok) setValue('groupId', '');
  }, [anketaGroupIndex, filteredAnketaGroups, watchedGroupId, setValue]);

  const newPpMutation = useMutation({
    mutationFn: () => studentProfileApi.newProductionPractice().then((r) => r.data),
    onSuccess: async (data) => {
      toast.success(data.message ?? 'Анкета снова доступна для редактирования');
      await queryClient.invalidateQueries({ queryKey: ['student-profile-me'] });
      await refreshStudentAccess();
    },
    onError: (err: unknown) => {
      const ax = err as { response?: { data?: { error?: string } } };
      toast.error(ax.response?.data?.error ?? 'Не удалось начать новую заявку');
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values: StudentAnketaFormValues) =>
      studentProfileApi.updateMe(formValuesToPayload(values)),
    onSuccess: async () => {
      toast.success('Анкета сохранена');
      await queryClient.invalidateQueries({ queryKey: ['student-profile-me'] });
      await refreshStudentAccess();
    },
    onError: (err: unknown) => {
      const ax = err as { response?: { data?: { error?: string; errors?: { msg: string }[] } } };
      const msg = ax.response?.data?.errors?.[0]?.msg ?? ax.response?.data?.error ?? 'Не удалось сохранить';
      toast.error(msg);
    },
  });

  if (lookupsLoading || profileLoading || !profile) return <PageLoader />;

  const status = profile.reviewStatus as ProfileReviewStatus;
  const readOnly = !profile.canEdit;
  const isApproved = status === 'APPROVED';

  const onSave = (values: StudentAnketaFormValues) => {
    if (readOnly) return;
    saveMutation.mutate(values);
  };

  const onSubmitForReview = handleSubmit(async (values) => {
    try {
      await studentProfileApi.updateMe(formValuesToPayload(values));
      const res = await studentProfileApi.submitMe();
      toast.success(res.data.message ?? 'Отправлено на проверку');
      await queryClient.invalidateQueries({ queryKey: ['student-profile-me'] });
      await refreshStudentAccess();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string; errors?: { msg: string }[] } } };
      const msg = ax.response?.data?.errors?.[0]?.msg ?? ax.response?.data?.error ?? 'Не удалось отправить';
      toast.error(msg);
    }
  });

  const dis = readOnly ? 'bg-gray-50' : '';

  return (
    <div>
      <PageHeader
        title={isApproved ? 'Моя анкета' : 'Анкета студента'}
        subtitle={reviewStatusDescription(status)}
        icon={<ClipboardCheck size={20} />}
      />

      <div className="space-y-6">
        <div className="card p-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-600">Статус проверки:</span>
          <span className="badge badge-blue font-medium">{REVIEW_STATUS_LABEL[status]}</span>
          {studentAccess && !studentAccess.isProfileComplete && status === 'DRAFT' && (
            <span className="text-xs text-amber-700">Заполните все поля, затем отправьте анкету.</span>
          )}
        </div>

        {profile.canStartNewProductionPractice && (
          <div className="card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-primary-200 bg-primary-50/40">
            <p className="text-sm text-gray-700">
              Нужна анкета на следующую <strong>производственную практику</strong> (другие даты, другой модуль/место)?
              За год может быть несколько ПП — отредактируйте период и при необходимости организацию, затем снова отправьте на
              проверку.
            </p>
            <button
              type="button"
              disabled={newPpMutation.isPending}
              onClick={() => newPpMutation.mutate()}
              className="btn-primary shrink-0 whitespace-nowrap"
            >
              {newPpMutation.isPending ? '…' : 'Новая заявка на ПП'}
            </button>
          </div>
        )}

        {status === 'PENDING_REVIEW' && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Данные отправлены на проверку методисту/администратору. Текущий статус:{' '}
            <strong>{REVIEW_STATUS_LABEL.PENDING_REVIEW}</strong>.
          </div>
        )}

        {status === 'REJECTED' && profile.rejectionReason && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 flex gap-2">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Причина отклонения</div>
              <p className="mt-1">{profile.rejectionReason}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSave)} className="card p-6 space-y-8">
          <div className="space-y-4">
            <SectionTitle>Общие сведения</SectionTitle>
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="ФИО" required error={errors.fio?.message}>
                <input {...register('fio', { required: 'Укажите ФИО' })} disabled={readOnly} className={`input ${dis}`} />
              </FormField>
              <FormField
                label="Индекс группы"
                hint="Сначала направление (Э, П, ИП…), затем конкретная группа"
              >
                <select
                  value={anketaGroupIndex}
                  onChange={(e) => {
                    setAnketaGroupIndex(e.target.value);
                    setValue('groupId', '');
                  }}
                  disabled={readOnly}
                  className={`input ${dis}`}
                >
                  <option value="">Все направления</option>
                  {anketaIndices.map((idx) => (
                    <option key={idx} value={idx}>
                      {exportLabelForIndex(groupIndexLabels, idx)}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Группа" required error={errors.groupId?.message}>
                <select {...register('groupId', { required: 'Выберите группу' })} disabled={readOnly} className={`input ${dis}`}>
                  <option value="">—</option>
                  {filteredAnketaGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.groupName}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Телефон" required error={errors.phone?.message}>
                <input
                  {...register('phone', { required: 'Укажите телефон' })}
                  disabled={readOnly}
                  className={`input ${dis}`}
                  placeholder="+7 …"
                />
              </FormField>
              <FormField
                label="Организация из справочника (необязательно)"
                hint="Если нужно связать с карточкой в системе."
              >
                <select {...register('organizationId')} disabled={readOnly} className={`input ${dis}`}>
                  <option value="">— не выбрано —</option>
                  {lookups?.organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          </div>

          <div className="space-y-4">
            <SectionTitle>Организация (место прохождения практики)</SectionTitle>
            <p className="text-xs text-gray-500 -mt-2">
              Укажите данные реальной организации, где вы проходите практику (как в отчётных документах).
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Название организации" required error={errors.placementOrgName?.message}>
                <input {...register('placementOrgName', { required: 'Обязательно' })} disabled={readOnly} className={`input ${dis}`} />
              </FormField>
              <FormField label="Адрес" required error={errors.placementOrgAddress?.message}>
                <input {...register('placementOrgAddress', { required: 'Обязательно' })} disabled={readOnly} className={`input ${dis}`} />
              </FormField>
              <FormField label="Email организации" required error={errors.placementOrgEmail?.message}>
                <input
                  type="email"
                  {...register('placementOrgEmail', { required: 'Обязательно' })}
                  disabled={readOnly}
                  className={`input ${dis}`}
                />
              </FormField>
              <FormField label="Телефон организации" required error={errors.placementOrgPhone?.message}>
                <input {...register('placementOrgPhone', { required: 'Обязательно' })} disabled={readOnly} className={`input ${dis}`} />
              </FormField>
              <FormField label="Руководитель организации (ФИО)" required error={errors.placementOrgHeadFio?.message}>
                <input {...register('placementOrgHeadFio', { required: 'Обязательно' })} disabled={readOnly} className={`input ${dis}`} />
              </FormField>
              <FormField label="Должность руководителя" required error={errors.placementOrgHeadPosition?.message}>
                <input {...register('placementOrgHeadPosition', { required: 'Обязательно' })} disabled={readOnly} className={`input ${dis}`} />
              </FormField>
              <FormField label="Ответственный за практику от организации (ФИО)" required error={errors.placementPracticeRespFio?.message}>
                <input {...register('placementPracticeRespFio', { required: 'Обязательно' })} disabled={readOnly} className={`input ${dis}`} />
              </FormField>
              <FormField label="Должность ответственного" required error={errors.placementPracticeRespPosition?.message}>
                <input {...register('placementPracticeRespPosition', { required: 'Обязательно' })} disabled={readOnly} className={`input ${dis}`} />
              </FormField>
              <FormField label="Телефон ответственного" required error={errors.placementPracticeRespPhone?.message}>
                <input {...register('placementPracticeRespPhone', { required: 'Обязательно' })} disabled={readOnly} className={`input ${dis}`} />
              </FormField>
              <FormField
                label="Время до метро (мин.)"
                hint="Необязательно, 1–180."
                error={errors.placementMetroMin?.message}
              >
                <input
                  type="number"
                  min={1}
                  max={180}
                  {...register('placementMetroMin')}
                  disabled={readOnly}
                  className={`input ${dis}`}
                />
              </FormField>
              <FormField label="Руководитель на месте практики (ФИО)" required error={errors.placementOrgSupervisorFio?.message}>
                <input {...register('placementOrgSupervisorFio', { required: 'Обязательно' })} disabled={readOnly} className={`input ${dis}`} />
              </FormField>
            </div>
          </div>

          <div className="space-y-4">
            <SectionTitle>Учебная практика / модуль</SectionTitle>
            {practiceOffersPayload?.qualificationLabel && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-950">
                Направление по выбранной группе:{' '}
                <strong>{practiceOffersPayload.qualificationLabel}</strong>
                {practiceOffersPayload.indexKey ? (
                  <span className="text-emerald-800/90"> (индекс {practiceOffersPayload.indexKey})</span>
                ) : null}
              </div>
            )}
            {practiceOffersPayload && practiceOffersPayload.offers.length > 0 && (
              <FormField
                label="Практика по учебному графику"
                hint="В списке видны даты. Выбор подставит модуль, практику и период ниже — при необходимости отредактируйте вручную."
              >
                <select
                  value={selectedScheduleOfferId}
                  onChange={(e) => setSelectedScheduleOfferId(e.target.value)}
                  disabled={readOnly}
                  className={`input ${dis}`}
                >
                  <option value="">— не из графика, заполнить вручную —</option>
                  {practiceOffersPayload.offers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.practice.practiceIndex} {o.practice.practiceName} · {fmtRuYmd(o.periodStart)} —{' '}
                      {fmtRuYmd(o.periodEnd)}
                      {o.note ? ` · ${o.note}` : ''}
                    </option>
                  ))}
                </select>
              </FormField>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Индекс модуля (МДК)" required error={errors.placementModuleIndex?.message}>
                <input {...register('placementModuleIndex', { required: 'Обязательно' })} disabled={readOnly} className={`input ${dis}`} placeholder="МДК.01.01" />
              </FormField>
              <FormField label="Название модуля" required error={errors.placementModuleName?.message}>
                <input {...register('placementModuleName', { required: 'Обязательно' })} disabled={readOnly} className={`input ${dis}`} />
              </FormField>
              <FormField label="Индекс практики" required error={errors.placementPracticeIndex?.message}>
                <input {...register('placementPracticeIndex', { required: 'Обязательно' })} disabled={readOnly} className={`input ${dis}`} placeholder="ПП.01.01" />
              </FormField>
              <FormField label="Название практики" required error={errors.placementPracticeName?.message}>
                <input {...register('placementPracticeName', { required: 'Обязательно' })} disabled={readOnly} className={`input ${dis}`} />
              </FormField>
              <FormField label="Дата начала практики" required error={errors.placementPeriodStart?.message}>
                <input type="date" {...register('placementPeriodStart', { required: 'Обязательно' })} disabled={readOnly} className={`input ${dis}`} />
              </FormField>
              <FormField label="Дата окончания практики" required error={errors.placementPeriodEnd?.message}>
                <input type="date" {...register('placementPeriodEnd', { required: 'Обязательно' })} disabled={readOnly} className={`input ${dis}`} />
              </FormField>
            </div>
          </div>

          <div className="space-y-4">
            <SectionTitle>Руководитель практики от техникума</SectionTitle>
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="ФИО" required error={errors.placementTechSupervisorFio?.message}>
                <input {...register('placementTechSupervisorFio', { required: 'Обязательно' })} disabled={readOnly} className={`input ${dis}`} />
              </FormField>
              <FormField label="Должность" required error={errors.placementTechSupervisorPosition?.message}>
                <input {...register('placementTechSupervisorPosition', { required: 'Обязательно' })} disabled={readOnly} className={`input ${dis}`} />
              </FormField>
              <FormField label="Телефон" required error={errors.placementTechSupervisorPhone?.message}>
                <input {...register('placementTechSupervisorPhone', { required: 'Обязательно' })} disabled={readOnly} className={`input ${dis}`} />
              </FormField>
            </div>
          </div>

          {profile.canEdit && (
            <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
              <button type="submit" disabled={saveMutation.isPending} className="btn-secondary">
                {saveMutation.isPending ? 'Сохранение…' : 'Сохранить черновик'}
              </button>
              {profile.canSubmitForReview && (
                <button
                  type="button"
                  onClick={() => void onSubmitForReview()}
                  disabled={saveMutation.isPending}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Send size={16} />
                  Отправить на проверку
                </button>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
