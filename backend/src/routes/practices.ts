import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import type { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { findOrCreateModuleByIndex } from '../utils/findOrCreateModule';
import {
  authenticate,
  requireNotStudent,
  requireMethodist,
  requireAdmin,
  AuthRequest,
} from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(requireNotStudent);

router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  const practices = await prisma.practice.findMany({
    include: { module: true },
    orderBy: { practiceIndex: 'asc' },
  });
  res.json(practices);
});

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const practice = await prisma.practice.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      module: true,
      assignments: {
        include: {
          student: { include: { group: true } },
          organization: true,
          techSupervisor: true,
        },
      },
    },
  });
  if (!practice) { res.status(404).json({ error: 'Практика не найдена' }); return; }
  res.json(practice);
});

router.post(
  '/',
  requireMethodist,
  [
    body('practiceIndex').notEmpty().withMessage('Индекс ПП обязателен'),
    body('practiceName').notEmpty().withMessage('Название практики обязательно'),
    body('moduleIndex').notEmpty().withMessage('Индекс модуля обязателен'),
    body('moduleName').notEmpty().withMessage('Наименование модуля обязательно'),
    body('periodStart').isISO8601().withMessage('Дата начала обязательна'),
    body('periodEnd').isISO8601().withMessage('Дата окончания обязательна'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    const { periodStart, periodEnd, practiceIndex, practiceName, moduleIndex, moduleName } = req.body;
    if (new Date(periodEnd) < new Date(periodStart)) {
      res.status(400).json({ error: 'Дата окончания не может быть раньше даты начала' });
      return;
    }

    try {
      const { id: moduleId } = await findOrCreateModuleByIndex(
        String(moduleIndex),
        String(moduleName)
      );
      const practice = await prisma.practice.create({
        data: {
          practiceIndex: String(practiceIndex).trim(),
          practiceName: String(practiceName).trim(),
          moduleId,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
        },
        include: { module: true },
      });
      res.status(201).json(practice);
    } catch (e) {
      if (e instanceof Error && e.message === 'module_index_and_name_required') {
        res.status(400).json({ error: 'Укажите индекс и наименование модуля' });
        return;
      }
      res.status(409).json({ error: 'Практика с таким индексом уже существует' });
    }
  }
);

router.put('/:id', requireMethodist, async (req: AuthRequest, res: Response): Promise<void> => {
  const { periodStart, periodEnd, moduleIndex, moduleName } = req.body;
  if (periodStart && periodEnd && new Date(periodEnd) < new Date(periodStart)) {
    res.status(400).json({ error: 'Дата окончания не может быть раньше даты начала' });
    return;
  }

  const data: Prisma.PracticeUncheckedUpdateInput = {};
  if (req.body.practiceIndex != null && String(req.body.practiceIndex).trim() !== '') {
    data.practiceIndex = String(req.body.practiceIndex).trim();
  }
  if (req.body.practiceName != null && String(req.body.practiceName).trim() !== '') {
    data.practiceName = String(req.body.practiceName).trim();
  }
  if (periodStart) data.periodStart = new Date(periodStart);
  if (periodEnd) data.periodEnd = new Date(periodEnd);

  const hasModule =
    moduleIndex != null &&
    String(moduleIndex).trim() !== '' &&
    moduleName != null &&
    String(moduleName).trim() !== '';
  if (hasModule) {
    try {
      const { id: moduleId } = await findOrCreateModuleByIndex(String(moduleIndex), String(moduleName));
      data.moduleId = moduleId;
    } catch (e) {
      if (e instanceof Error && e.message === 'module_index_and_name_required') {
        res.status(400).json({ error: 'Укажите индекс и наименование модуля' });
        return;
      }
      throw e;
    }
  }

  try {
    const practice = await prisma.practice.update({
      where: { id: Number(req.params.id) },
      data,
      include: { module: true },
    });
    res.json(practice);
  } catch {
    res.status(409).json({ error: 'Не удалось сохранить (возможно, индекс ПП уже занят)' });
  }
});

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.practice.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

export default router;
