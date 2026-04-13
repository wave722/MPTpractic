import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import { groupIndexFromGroupName } from '../utils/groupIndex';
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

/** Список групп нужен студентам для анкеты; методистам из админ-маршрута — нет. */
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const r = req.user?.role;
  if (r === 'METHODIST') {
    res.status(403).json({ error: 'Доступно только администратору, наблюдателю или студенту' });
    return;
  }
  if (r !== 'ADMIN' && r !== 'OBSERVER' && r !== 'STUDENT') {
    res.status(403).json({ error: 'Недостаточно прав' });
    return;
  }
  const { groupIndex: groupIndexQuery } = req.query;
  const where =
    typeof groupIndexQuery === 'string' && groupIndexQuery.trim().length > 0
      ? { groupIndex: groupIndexQuery.trim() }
      : {};

  const groups = await prisma.group.findMany({
    where,
    include: { _count: { select: { students: true } } },
    orderBy: [{ groupIndex: 'asc' }, { groupName: 'asc' }],
  });
  res.json(groups);
});

router.use(requireNotMethodist);
router.use(requireNotStudent);

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const group = await prisma.group.findUnique({
    where: { id: Number(req.params.id) },
    include: { students: true },
  });
  if (!group) { res.status(404).json({ error: 'Группа не найдена' }); return; }
  res.json(group);
});

router.post(
  '/',
  requireMethodist,
  [body('groupName').notEmpty().withMessage('Название группы обязательно')],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    const groupName = String(req.body.groupName).trim();
    let groupIndex = typeof req.body.groupIndex === 'string' ? req.body.groupIndex.trim() : '';
    if (!groupIndex) groupIndex = groupIndexFromGroupName(groupName);
    if (!groupIndex) {
      res.status(400).json({ error: 'Укажите индекс группы (например Э, П, ИП)' });
      return;
    }

    try {
      const group = await prisma.group.create({ data: { groupName, groupIndex } });
      res.status(201).json(group);
    } catch {
      res.status(409).json({ error: 'Группа с таким названием уже существует' });
    }
  }
);

router.put('/:id', requireMethodist, async (req: AuthRequest, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const existing = await prisma.group.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Группа не найдена' });
    return;
  }

  const groupName =
    req.body.groupName !== undefined && req.body.groupName !== ''
      ? String(req.body.groupName).trim()
      : existing.groupName;
  let groupIndex = typeof req.body.groupIndex === 'string' ? req.body.groupIndex.trim() : '';
  if (!groupIndex) groupIndex = existing.groupIndex || groupIndexFromGroupName(groupName);
  if (!groupIndex) groupIndex = groupIndexFromGroupName(groupName);
  if (!groupIndex) {
    res.status(400).json({ error: 'Укажите индекс группы (например Э, П, ИП)' });
    return;
  }

  const group = await prisma.group.update({
    where: { id },
    data: { groupName, groupIndex },
  });
  res.json(group);
});

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.group.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

export default router;
