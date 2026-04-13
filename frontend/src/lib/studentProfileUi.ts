import type { ProfileReviewStatus } from '@/types';

export const REVIEW_STATUS_LABEL: Record<ProfileReviewStatus, string> = {
  DRAFT: 'Черновик',
  PENDING_REVIEW: 'На проверке',
  APPROVED: 'Подтверждено',
  REJECTED: 'Отклонено',
};

export function reviewStatusDescription(status: ProfileReviewStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'Заполните анкету и отправьте её на проверку.';
    case 'PENDING_REVIEW':
      return 'Данные отправлены на проверку методисту/администратору. Ожидайте решения.';
    case 'APPROVED':
      return 'Анкета подтверждена. Вам доступен просмотр назначений практики.';
    case 'REJECTED':
      return 'Анкета отклонена. Исправьте данные и отправьте снова.';
    default:
      return '';
  }
}
