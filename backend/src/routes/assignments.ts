import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { organizationId, practiceId, groupId, groupIndex, techSupervisorId } = req.query;

  if (req.user?.role === 'STUDENT') {
    const u = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        linkedStudent: { select: { id: true, userId: true } },
      },
    });
    if (!u?.linkedStudent) {
      res.status(403).json({
        error: 'Назначения практики доступны после первого подтверждения анкеты методистом или администратором.',
        code: 'STUDENT_ACCESS_RESTRICTED',
      });
      return;
    }
    if (u.linkedStudent.userId !== req.user.id) {
      res.status(403).json({ error: 'Недостаточно прав', code: 'STUDENT_ACCESS_RESTRICTED' });
      return;
    }

    const now = new Date();
    const assignments = await prisma.studentPracticeAssignment.findMany({
      where: {
        studentId: u.linkedStudent.id,
        practice: { periodStart: { lte: now } },
      },
      include: {
        student: { include: { group: true } },
        practice: { include: { module: true } },
        organization: true,
        techSupervisor: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(assignments);
    return;
  }

  const studentWhere: { groupId?: number; group?: { groupIndex: string } } = {};
  if (groupId) {
    studentWhere.groupId = Number(groupId);
  } else if (typeof groupIndex === 'string' && groupIndex.trim()) {
    studentWhere.group = { groupIndex: groupIndex.trim() };
  }

  const assignments = await prisma.studentPracticeAssignment.findMany({
    where: {
      ...(req.user?.role === 'METHODIST' && req.user.techSupervisorId
        ? { techSupervisorId: req.user.techSupervisorId }
        : {}),
      ...(organizationId && { organizationId: Number(organizationId) }),
      ...(practiceId && { practiceId: Number(practiceId) }),
      ...(techSupervisorId && { techSupervisorId: Number(techSupervisorId) }),
      ...(Object.keys(studentWhere).length ? { student: studentWhere } : {}),
    },
    include: {
      student: { include: { group: true } },
      practice: { include: { module: true } },
      organization: true,
      techSupervisor: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(assignments);
});

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const assignment = await prisma.studentPracticeAssignment.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      student: { include: { group: true } },
      practice: { include: { module: true } },
      organization: true,
      techSupervisor: true,
    },
  });
  if (!assignment) { res.status(404).json({ error: 'Назначение не найдено' }); return; }

  if (req.user?.role === 'STUDENT') {
    const u = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        linkedStudent: { select: { id: true, userId: true } },
      },
    });
    const now = new Date();
    if (
      !u?.linkedStudent ||
      assignment.studentId !== u.linkedStudent.id ||
      u.linkedStudent.userId !== req.user.id ||
      assignment.practice.periodStart > now
    ) {
      res.status(403).json({
        error: 'Назначение недоступно',
        code: 'STUDENT_ACCESS_RESTRICTED',
      });
      return;
    }
  }

  if (req.user?.role === 'METHODIST') {
    if (!req.user.techSupervisorId || assignment.techSupervisorId !== req.user.techSupervisorId) {
      res.status(403).json({ error: 'Недостаточно прав' });
      return;
    }
  }
  res.json(assignment);
});

router.post(
  '/',
  requireAdmin,
  [
    body('studentId').isInt().withMessage('Студент обязателен'),
    body('practiceId').isInt().withMessage('Практика обязательна'),
    body('organizationId').isInt().withMessage('Организация обязательна'),
    body('techSupervisorId').isInt().withMessage('Руководитель от техникума обязателен'),
    body('orgSupervisorFio').notEmpty().withMessage('Руководитель от организации обязателен'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    try {
      const assignment = await prisma.studentPracticeAssignment.create({
        data: {
          studentId: Number(req.body.studentId),
          practiceId: Number(req.body.practiceId),
          organizationId: Number(req.body.organizationId),
          techSupervisorId: Number(req.body.techSupervisorId),
          orgSupervisorFio: req.body.orgSupervisorFio,
        },
        include: {
          student: { include: { group: true } },
          practice: { include: { module: true } },
          organization: true,
          techSupervisor: true,
        },
      });
      res.status(201).json(assignment);
    } catch {
      res.status(409).json({ error: 'Студент уже назначен на эту практику' });
    }
  }
);

router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const data: Record<string, unknown> = {};
  if (req.body.organizationId) data.organizationId = Number(req.body.organizationId);
  if (req.body.techSupervisorId) data.techSupervisorId = Number(req.body.techSupervisorId);
  if (req.body.orgSupervisorFio) data.orgSupervisorFio = req.body.orgSupervisorFio;

  const assignment = await prisma.studentPracticeAssignment.update({
    where: { id: Number(req.params.id) },
    data,
    include: {
      student: { include: { group: true } },
      practice: { include: { module: true } },
      organization: true,
      techSupervisor: true,
    },
  });
  res.json(assignment);
});

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.studentPracticeAssignment.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

export default router;
