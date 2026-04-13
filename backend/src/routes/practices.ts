import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import {
  authenticate,
  requireNotMethodist,
  requireNotStudent,
  requireMethodist,
  requireAdmin,
  AuthRequest,
} from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(requireNotStudent);
router.use(requireNotMethodist);

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
    body('moduleId').isInt().withMessage('Модуль обязателен'),
    body('periodStart').isISO8601().withMessage('Дата начала обязательна'),
    body('periodEnd').isISO8601().withMessage('Дата окончания обязательна'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    const { periodStart, periodEnd } = req.body;
    if (new Date(periodEnd) < new Date(periodStart)) {
      res.status(400).json({ error: 'Дата окончания не может быть раньше даты начала' });
      return;
    }

    try {
      const practice = await prisma.practice.create({
        data: {
          ...req.body,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
        },
        include: { module: true },
      });
      res.status(201).json(practice);
    } catch {
      res.status(409).json({ error: 'Практика с таким индексом уже существует' });
    }
  }
);

router.put('/:id', requireMethodist, async (req: AuthRequest, res: Response): Promise<void> => {
  const { periodStart, periodEnd } = req.body;
  if (periodStart && periodEnd && new Date(periodEnd) < new Date(periodStart)) {
    res.status(400).json({ error: 'Дата окончания не может быть раньше даты начала' });
    return;
  }

  const practice = await prisma.practice.update({
    where: { id: Number(req.params.id) },
    data: {
      ...req.body,
      ...(periodStart && { periodStart: new Date(periodStart) }),
      ...(periodEnd && { periodEnd: new Date(periodEnd) }),
    },
    include: { module: true },
  });
  res.json(practice);
});

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.practice.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

export default router;
