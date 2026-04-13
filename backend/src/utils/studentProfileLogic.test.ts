import { describe, it, expect } from 'vitest';
import {
  isStudentProfileComplete,
  canStudentEditProfile,
  canStudentSubmitForReview,
} from './studentProfileLogic';

const base = {
  fio: 'Иванов И.И.',
  groupId: 1,
  phone: '+7999',
  placementOrgName: 'ООО Ромашка',
  placementOrgAddress: 'Москва',
  placementOrgEmail: 'hr@romashka.ru',
  placementOrgPhone: '+7495',
  placementOrgHeadFio: 'Петров П.П.',
  placementOrgHeadPosition: 'Директор',
  placementPracticeRespFio: 'Сидоров С.С.',
  placementPracticeRespPosition: 'HR',
  placementPracticeRespPhone: '+74951',
  placementPeriodStart: new Date('2026-06-01'),
  placementPeriodEnd: new Date('2026-06-28'),
  placementModuleIndex: 'МДК.01.01',
  placementModuleName: 'Модуль',
  placementPracticeIndex: 'ПП.01.01',
  placementPracticeName: 'Практика',
  placementTechSupervisorFio: 'Преподаватель П.П.',
  placementTechSupervisorPosition: 'Преподаватель',
  placementTechSupervisorPhone: '+7998',
  placementOrgSupervisorFio: 'Наставник Н.Н.',
  placementMetroMin: null as number | null,
};

describe('studentProfileLogic', () => {
  it('isStudentProfileComplete accepts full placement', () => {
    expect(isStudentProfileComplete({ ...base, placementMetroMin: 15 })).toBe(true);
    expect(isStudentProfileComplete({ ...base, placementMetroMin: null })).toBe(true);
  });

  it('rejects incomplete or invalid period', () => {
    expect(isStudentProfileComplete({ ...base, placementOrgName: '' })).toBe(false);
    expect(
      isStudentProfileComplete({
        ...base,
        placementPeriodEnd: new Date('2026-05-01'),
        placementPeriodStart: new Date('2026-06-01'),
      })
    ).toBe(false);
    expect(isStudentProfileComplete({ ...base, placementMetroMin: 0 })).toBe(false);
    expect(isStudentProfileComplete({ ...base, placementMetroMin: 200 })).toBe(false);
  });

  it('canStudentEditProfile', () => {
    expect(canStudentEditProfile('DRAFT')).toBe(true);
    expect(canStudentEditProfile('REJECTED')).toBe(true);
    expect(canStudentEditProfile('PENDING_REVIEW')).toBe(false);
    expect(canStudentEditProfile('APPROVED')).toBe(false);
  });

  it('canStudentSubmitForReview', () => {
    expect(canStudentSubmitForReview('DRAFT', true)).toBe(true);
    expect(canStudentSubmitForReview('REJECTED', true)).toBe(true);
    expect(canStudentSubmitForReview('DRAFT', false)).toBe(false);
    expect(canStudentSubmitForReview('PENDING_REVIEW', true)).toBe(false);
  });
});
