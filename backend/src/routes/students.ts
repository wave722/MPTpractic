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

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { search, groupId, groupIndex, organizationId, practiceId, techSupervisorId } = req.query;

  const where: Record<string, unknown> = {};

  if (search) {
    where.fio = { contains: String(search) };
  }
  if (groupId) {
    where.groupId = Number(groupId);
  } else if (typeof groupIndex === 'string' && groupIndex.trim()) {
    where.group = { groupIndex: groupIndex.trim() };
  }

  const students = await prisma.student.findMany({
    where,
    include: {
      group: true,
      assignments: {
        where: {
          ...(organizationId && { organizationId: Number(organizationId) }),
          ...(practiceId && { practiceId: Number(practiceId) }),
          ...(techSupervisorId && { techSupervisorId: Number(techSupervisorId) }),
        },
        include: {
          practice: { include: { module: true } },
          organization: true,
          techSupervisor: true,
        },
      },
    },
    orderBy: { fio: 'asc' },
  });

  // If filtered by org/practice/supervisor, only return students with matching assignments
  const filtered =
    organizationId || practiceId || techSupervisorId
      ? students.filter((s) => s.assignments.length > 0)
      : students;

  res.json(filtered);
});

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const student = await prisma.student.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      group: true,
      assignments: {
        include: {
          practice: { include: { module: true } },
          organization: true,
          techSupervisor: true,
        },
      },
    },
  });
  if (!student) { res.status(404).json({ error: 'Студент не найден' }); return; }
  res.json(student);
});

router.post(
  '/',
  requireMethodist,
  [
    body('fio').notEmpty().withMessage('ФИО студента обязательно'),
    body('groupId').isInt().withMessage('Группа обязательна'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    const student = await prisma.student.create({
      data: { fio: req.body.fio, groupId: Number(req.body.groupId) },
      include: { group: true },
    });
    res.status(201).json(student);
  }
);

router.put('/:id', requireMethodist, async (req: AuthRequest, res: Response): Promise<void> => {
  const student = await prisma.student.update({
    where: { id: Number(req.params.id) },
    data: {
      ...(req.body.fio && { fio: req.body.fio }),
      ...(req.body.groupId && { groupId: Number(req.body.groupId) }),
    },
    include: { group: true },
  });
  res.json(student);
});

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.student.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

export default router;
