import { body, ValidationChain } from 'express-validator';

const t = (field: string, msg: string): ValidationChain => body(field).trim().notEmpty().withMessage(msg);

/** Валидация тела PUT /student-profile/me (полная анкета). */
export const studentProfileUpdateValidators: ValidationChain[] = [
  t('fio', 'ФИО обязательно'),
  body('groupId').isInt({ min: 1 }).withMessage('Выберите группу'),
  t('phone', 'Телефон обязателен'),
  body('organizationId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Некорректная организация из справочника'),

  t('placementOrgName', 'Укажите название организации (место практики)'),
  t('placementOrgAddress', 'Укажите адрес организации'),
  body('placementOrgEmail').isEmail().withMessage('Некорректный email организации'),
  t('placementOrgPhone', 'Укажите телефон организации'),
  t('placementOrgHeadFio', 'Укажите ФИО руководителя организации'),
  t('placementOrgHeadPosition', 'Укажите должность руководителя организации'),
  t('placementPracticeRespFio', 'Укажите ФИО ответственного за практику от организации'),
  t('placementPracticeRespPosition', 'Укажите должность ответственного'),
  t('placementPracticeRespPhone', 'Укажите телефон ответственного за практику'),
  body('placementMetroMin')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1, max: 180 })
    .withMessage('Время до метро: от 1 до 180 минут'),

  body('placementPeriodStart')
    .notEmpty()
    .withMessage('Укажите дату начала практики')
    .custom((v) => !Number.isNaN(Date.parse(String(v))))
    .withMessage('Некорректная дата начала практики'),
  body('placementPeriodEnd')
    .notEmpty()
    .withMessage('Укажите дату окончания практики')
    .custom((v) => !Number.isNaN(Date.parse(String(v))))
    .withMessage('Некорректная дата окончания практики')
    .custom((end, { req }) => {
      const start = (req as { body: { placementPeriodStart?: string } }).body.placementPeriodStart;
      if (!start || !end) return true;
      return new Date(end).getTime() >= new Date(start).getTime();
    })
    .withMessage('Окончание практики не раньше начала'),

  t('placementModuleIndex', 'Укажите индекс модуля (МДК)'),
  t('placementModuleName', 'Укажите название модуля'),
  t('placementPracticeIndex', 'Укажите индекс практики'),
  t('placementPracticeName', 'Укажите название практики'),
  t('placementTechSupervisorFio', 'Укажите ФИО руководителя от техникума'),
  t('placementTechSupervisorPosition', 'Укажите должность руководителя от техникума'),
  t('placementTechSupervisorPhone', 'Укажите телефон руководителя от техникума'),
  t('placementOrgSupervisorFio', 'Укажите ФИО руководителя от организации на месте практики'),
];
