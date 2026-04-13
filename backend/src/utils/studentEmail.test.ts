import { describe, it, expect } from 'vitest';
import { isAllowedStudentEmailDomain, STUDENT_EMAIL_DOMAIN_ERROR } from './studentEmail';

describe('isAllowedStudentEmailDomain', () => {
  it('allows user@mpt.ru', () => {
    expect(isAllowedStudentEmailDomain('user@mpt.ru')).toBe(true);
    expect(isAllowedStudentEmailDomain('  User@MPT.RU  ')).toBe(true);
  });

  it('allows plus addressing on mpt.ru', () => {
    expect(isAllowedStudentEmailDomain('a+b@mpt.ru')).toBe(true);
  });

  it('rejects other domains', () => {
    expect(isAllowedStudentEmailDomain('a@gmail.com')).toBe(false);
    expect(isAllowedStudentEmailDomain('a@yandex.ru')).toBe(false);
    expect(isAllowedStudentEmailDomain('a@mpt.com')).toBe(false);
    expect(isAllowedStudentEmailDomain('a@mail.mpt.ru')).toBe(false);
    expect(isAllowedStudentEmailDomain('a@mpt.ru.evil.com')).toBe(false);
  });

  it('exports readable error message', () => {
    expect(STUDENT_EMAIL_DOMAIN_ERROR).toContain('@mpt.ru');
  });
});
