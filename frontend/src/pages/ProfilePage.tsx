import { User as UserIcon, Mail, Shield } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuthStore } from '@/store/auth';
import { REVIEW_STATUS_LABEL, reviewStatusDescription } from '@/lib/studentProfileUi';
import type { ProfileReviewStatus } from '@/types';

export function ProfilePage() {
  const { user, studentAccess } = useAuthStore();

  const roleLabel: Record<string, string> = {
    ADMIN: 'Администратор',
    METHODIST: 'Методист',
    OBSERVER: 'Наблюдатель',
    STUDENT: 'Студент',
  };

  return (
    <div>
      <PageHeader
        title="Мой профиль"
        subtitle="Данные текущего пользователя"
        icon={<UserIcon size={20} />}
      />

      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
            <UserIcon size={22} className="text-primary-700" />
          </div>
          <div className="flex-1">
            <div className="text-lg font-semibold text-gray-900">{user?.name}</div>
            <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Mail size={14} className="text-gray-400" />
                <span className="font-medium text-gray-800">{user?.email}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Shield size={14} className="text-gray-400" />
                <span className="badge badge-gray">{user?.role ? roleLabel[user.role] : ''}</span>
              </div>
            </div>

            {user?.role === 'METHODIST' && (
              <div className="mt-4 p-3 rounded-lg bg-blue-50 text-xs text-blue-700">
                Для роли «Методист» доступны назначения, проверка анкет студентов и профиль.
              </div>
            )}

            {user?.role === 'STUDENT' && studentAccess && (
              <div className="mt-4 p-4 rounded-lg bg-gray-50 text-sm space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-gray-600">Статус анкеты:</span>
                  <span className="badge badge-blue">
                    {REVIEW_STATUS_LABEL[studentAccess.reviewStatus as ProfileReviewStatus]}
                  </span>
                </div>
                <p className="text-gray-600 text-xs leading-relaxed">
                  {reviewStatusDescription(studentAccess.reviewStatus as ProfileReviewStatus)}
                </p>
                {studentAccess.rejectionReason && (
                  <p className="text-xs text-red-700">
                    <span className="font-medium">Комментарий модератора: </span>
                    {studentAccess.rejectionReason}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

