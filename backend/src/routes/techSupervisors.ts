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
  const supervisors = await prisma.techSupervisor.findMany({
    include: {
      _count: { select: { assignments: true } },
    },
    orderBy: { fio: 'asc' },
  });
  res.json(supervisors);
});

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const supervisor = await prisma.techSupervisor.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      assignments: {
        include: {
          student: { include: { group: true } },
          practice: { include: { module: true } },
          organization: true,
        },
      },
    },
  });
  if (!supervisor) { res.status(404).json({ error: 'Руководитель не найден' }); return; }
  res.json(supervisor);
});

router.post(
  '/',
  requireMethodist,
  [
    body('fio').notEmpty().withMessage('ФИО обязательно'),
    body('position').notEmpty().withMessage('Должность обязательна'),
    body('phone').notEmpty().withMessage('Телефон обязателен'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    const supervisor = await prisma.techSupervisor.create({ data: req.body });
    res.status(201).json(supervisor);
  }
);

router.put('/:id', requireMethodist, async (req: AuthRequest, res: Response): Promise<void> => {
  const supervisor = await prisma.techSupervisor.update({
    where: { id: Number(req.params.id) },
    data: req.body,
  });
  res.json(supervisor);
});

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.techSupervisor.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

export default router;
