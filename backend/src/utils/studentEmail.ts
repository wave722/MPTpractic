/** Строгая проверка: локальная часть + ровно домен mpt.ru (без поддоменов и суффиксов). */
export function isAllowedStudentEmailDomain(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at < 1) return false;
  const domain = trimmed.slice(at + 1);
  return domain === 'mpt.ru';
}

export const STUDENT_EMAIL_DOMAIN_ERROR =
  'Для регистрации студента используйте почту @mpt.ru';
