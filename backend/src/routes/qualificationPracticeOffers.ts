import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import { parseDateInputYmd } from '../utils/dateInput';
import { authenticate, requireModerator, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(requireModerator);

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const raw = req.query.groupIndexLabelId;
  const where =
    raw !== undefined && raw !== '' && !Number.isNaN(Number(raw))
      ? { groupIndexLabelId: Number(raw) }
      : {};
  const rows = await prisma.qualificationPracticeOffer.findMany({
    where,
    include: { groupIndexLabel: true, practice: { include: { module: true } } },
    orderBy: [{ groupIndexLabelId: 'asc' }, { periodStart: 'asc' }],
  });
  res.json(rows);
});

router.post(
  '/',
  [
    body('groupIndexLabelId').isInt({ min: 1 }).withMessage('Квалификация'),
    body('practiceId').isInt({ min: 1 }).withMessage('Практика'),
    body('periodStart').notEmpty().withMessage('Дата начала'),
    body('periodEnd').notEmpty().withMessage('Дата окончания'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const groupIndexLabelId = Number(req.body.groupIndexLabelId);
    const practiceId = Number(req.body.practiceId);
    const periodStart = parseDateInputYmd(String(req.body.periodStart));
    const periodEnd = parseDateInputYmd(String(req.body.periodEnd));
    const note = req.body.note != null ? String(req.body.note).trim() : '';
    if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
      res.status(400).json({ error: 'Некорректные даты' });
      return;
    }
    if (periodEnd < periodStart) {
      res.status(400).json({ error: 'Дата окончания раньше даты начала' });
      return;
    }
    const [label, practice] = await Promise.all([
      prisma.groupIndexLabel.findUnique({ where: { id: groupIndexLabelId } }),
      prisma.practice.findUnique({ where: { id: practiceId } }),
    ]);
    if (!label) {
      res.status(400).json({ error: 'Квалификация не найдена' });
      return;
    }
    if (!practice) {
      res.status(400).json({ error: 'Практика не найдена' });
      return;
    }
    const row = await prisma.qualificationPracticeOffer.create({
      data: { groupIndexLabelId, practiceId, periodStart, periodEnd, note },
      include: { groupIndexLabel: true, practice: { include: { module: true } } },
    });
    res.status(201).json(row);
  }
);

router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const existing = await prisma.qualificationPracticeOffer.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Запись не найдена' });
    return;
  }
  const groupIndexLabelId =
    req.body.groupIndexLabelId != null && req.body.groupIndexLabelId !== ''
      ? Number(req.body.groupIndexLabelId)
      : existing.groupIndexLabelId;
  const practiceId =
    req.body.practiceId != null && req.body.practiceId !== ''
      ? Number(req.body.practiceId)
      : existing.practiceId;
  let periodStart =
    req.body.periodStart != null && String(req.body.periodStart) !== ''
      ? parseDateInputYmd(String(req.body.periodStart))
      : existing.periodStart;
  let periodEnd =
    req.body.periodEnd != null && String(req.body.periodEnd) !== ''
      ? parseDateInputYmd(String(req.body.periodEnd))
      : existing.periodEnd;
  const note =
    req.body.note !== undefined ? String(req.body.note).trim() : existing.note;
  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
    res.status(400).json({ error: 'Некорректные даты' });
    return;
  }
  if (periodEnd < periodStart) {
    res.status(400).json({ error: 'Дата окончания раньше даты начала' });
    return;
  }
  const [label, practice] = await Promise.all([
    prisma.groupIndexLabel.findUnique({ where: { id: groupIndexLabelId } }),
    prisma.practice.findUnique({ where: { id: practiceId } }),
  ]);
  if (!label || !practice) {
    res.status(400).json({ error: 'Квалификация или практика не найдены' });
    return;
  }
  try {
    const row = await prisma.qualificationPracticeOffer.update({
      where: { id },
      data: { groupIndexLabelId, practiceId, periodStart, periodEnd, note },
      include: { groupIndexLabel: true, practice: { include: { module: true } } },
    });
    res.json(row);
  } catch {
    res.status(500).json({ error: 'Не удалось сохранить' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const existing = await prisma.qualificationPracticeOffer.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Запись не найдена' });
    return;
  }
  await prisma.qualificationPracticeOffer.delete({ where: { id } });
  res.status(204).send();
});

export default router;
