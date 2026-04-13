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
  const modules = await prisma.module.findMany({ orderBy: { moduleIndex: 'asc' } });
  res.json(modules);
});

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const mod = await prisma.module.findUnique({
    where: { id: Number(req.params.id) },
    include: { practices: true },
  });
  if (!mod) { res.status(404).json({ error: 'Модуль не найден' }); return; }
  res.json(mod);
});

router.post(
  '/',
  requireMethodist,
  [
    body('moduleIndex').notEmpty().withMessage('Индекс модуля обязателен'),
    body('moduleName').notEmpty().withMessage('Наименование модуля обязательно'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    try {
      const mod = await prisma.module.create({ data: req.body });
      res.status(201).json(mod);
    } catch {
      res.status(409).json({ error: 'Модуль с таким индексом уже существует' });
    }
  }
);

router.put('/:id', requireMethodist, async (req: AuthRequest, res: Response): Promise<void> => {
  const mod = await prisma.module.update({
    where: { id: Number(req.params.id) },
    data: req.body,
  });
  res.json(mod);
});

router.patch('/:id/archive', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const mod = await prisma.module.update({
    where: { id: Number(req.params.id) },
    data: { archived: true },
  });
  res.json(mod);
});

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.module.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

export default router;
