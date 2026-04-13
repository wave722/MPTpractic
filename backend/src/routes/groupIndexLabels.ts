import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import { authenticate, requireModerator, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(requireModerator);

router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  const rows = await prisma.groupIndexLabel.findMany({
    orderBy: { indexKey: 'asc' },
  });
  res.json(rows);
});

router.post(
  '/',
  [
    body('indexKey').notEmpty().withMessage('Индекс обязателен'),
    body('exportLabel').notEmpty().withMessage('Текст для выгрузки обязателен'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const indexKey = String(req.body.indexKey).trim();
    const exportLabel = String(req.body.exportLabel).trim();
    try {
      const row = await prisma.groupIndexLabel.create({
        data: { indexKey, exportLabel },
      });
      res.status(201).json(row);
    } catch {
      res.status(409).json({ error: 'Запись с таким индексом уже есть' });
    }
  }
);

router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const existing = await prisma.groupIndexLabel.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Запись не найдена' });
    return;
  }
  const indexKey =
    req.body.indexKey !== undefined && String(req.body.indexKey).trim() !== ''
      ? String(req.body.indexKey).trim()
      : existing.indexKey;
  const exportLabel =
    req.body.exportLabel !== undefined && String(req.body.exportLabel).trim() !== ''
      ? String(req.body.exportLabel).trim()
      : existing.exportLabel;
  if (!indexKey || !exportLabel) {
    res.status(400).json({ error: 'Индекс и текст для выгрузки не могут быть пустыми' });
    return;
  }
  try {
    const row = await prisma.groupIndexLabel.update({
      where: { id },
      data: { indexKey, exportLabel },
    });
    res.json(row);
  } catch {
    res.status(409).json({ error: 'Запись с таким индексом уже есть' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const existing = await prisma.groupIndexLabel.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Запись не найдена' });
    return;
  }
  await prisma.groupIndexLabel.delete({ where: { id } });
  res.status(204).send();
});

export default router;
