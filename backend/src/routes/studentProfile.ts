import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import {
  authenticate,
  requireStudentRole,
  requireModerator,
  AuthRequest,
} from '../middleware/auth';
import {
  isStudentProfileComplete,
  canStudentEditProfile,
  canStudentSubmitForReview,
} from '../utils/studentProfileLogic';
import { studentProfileUpdateValidators } from '../utils/studentProfileValidators';
import { getPracticeOffersPayloadForGroupId } from '../utils/qualificationPracticeOffersForGroup';

const router = Router();

function placementDataFromBody(body: Record<string, unknown>) {
  const orgId = body.organizationId;
  const metro = body.placementMetroMin;
  return {
    fio: String(body.fio).trim(),
    groupId: Number(body.groupId),
    phone: String(body.phone).trim(),
    organizationId: orgId == null || orgId === '' ? null : Number(orgId),
    placementOrgName: String(body.placementOrgName).trim(),
    placementOrgAddress: String(body.placementOrgAddress).trim(),
    placementOrgEmail: String(body.placementOrgEmail).trim().toLowerCase(),
    placementOrgPhone: String(body.placementOrgPhone).trim(),
    placementOrgHeadFio: String(body.placementOrgHeadFio).trim(),
    placementOrgHeadPosition: String(body.placementOrgHeadPosition).trim(),
    placementPracticeRespFio: String(body.placementPracticeRespFio).trim(),
    placementPracticeRespPosition: String(body.placementPracticeRespPosition).trim(),
    placementPracticeRespPhone: String(body.placementPracticeRespPhone).trim(),
    placementMetroMin: metro == null || metro === '' ? null : Number(metro),
    placementPeriodStart: new Date(String(body.placementPeriodStart)),
    placementPeriodEnd: new Date(String(body.placementPeriodEnd)),
    placementModuleIndex: String(body.placementModuleIndex).trim(),
    placementModuleName: String(body.placementModuleName).trim(),
    placementPracticeIndex: String(body.placementPracticeIndex).trim(),
    placementPracticeName: String(body.placementPracticeName).trim(),
    placementTechSupervisorFio: String(body.placementTechSupervisorFio).trim(),
    placementTechSupervisorPosition: String(body.placementTechSupervisorPosition).trim(),
    placementTechSupervisorPhone: String(body.placementTechSupervisorPhone).trim(),
    placementOrgSupervisorFio: String(body.placementOrgSupervisorFio).trim(),
  };
}

/** Справочники для анкеты (только студент). */
router.get('/lookups', authenticate, requireStudentRole, async (_req: AuthRequest, res: Response): Promise<void> => {
  const [groups, organizations, groupIndexLabels] = await Promise.all([
    prisma.group.findMany({
      orderBy: [{ groupIndex: 'asc' }, { groupName: 'asc' }],
      select: { id: true, groupName: true, groupIndex: true },
    }),
    prisma.organization.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, address: true },
    }),
    prisma.groupIndexLabel.findMany({
      orderBy: { indexKey: 'asc' },
      select: { indexKey: true, exportLabel: true },
    }),
  ]);
  res.json({ groups, organizations, groupIndexLabels });
});

/** Варианты практик по графику для выбранной группы (квалификация + даты). */
router.get(
  '/practice-offers',
  authenticate,
  requireStudentRole,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const groupId = Number(req.query.groupId);
    if (!groupId || Number.isNaN(groupId)) {
      res.status(400).json({ error: 'Укажите groupId' });
      return;
    }
    const payload = await getPracticeOffersPayloadForGroupId(groupId);
    res.json(payload);
  }
);

router.get('/me', authenticate, requireStudentRole, async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: req.user!.id },
    include: {
      group: true,
      organization: true,
      reviewedBy: { select: { id: true, name: true, email: true } },
    },
  });
  if (!profile) {
    res.status(404).json({ error: 'Профиль студента не найден' });
    return;
  }
  const complete = isStudentProfileComplete(profile);
  const st = profile.reviewStatus;
  res.json({
    ...profile,
    isProfileComplete: complete,
    canEdit: canStudentEditProfile(st),
    canSubmitForReview: canStudentSubmitForReview(st, complete),
    canStartNewProductionPractice: st === 'APPROVED',
  });
});

/** Повторная подача анкеты на производственную практику (новые даты / новый цикл за год). */
router.post(
  '/me/new-production-practice',
  authenticate,
  requireStudentRole,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const existing = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!existing) {
      res.status(404).json({ error: 'Профиль студента не найден' });
      return;
    }
    if (existing.reviewStatus !== 'APPROVED') {
      res.status(409).json({
        error: 'Новую заявку на ПП можно подать только при подтверждённой анкете',
        reviewStatus: existing.reviewStatus,
      });
      return;
    }

    const profile = await prisma.studentProfile.update({
      where: { userId: req.user!.id },
      data: {
        reviewStatus: 'DRAFT',
        reviewedById: null,
        reviewedAt: null,
        rejectionReason: null,
      },
      include: { group: true, organization: true, reviewedBy: { select: { id: true, name: true, email: true } } },
    });

    const complete = isStudentProfileComplete(profile);
    const st = profile.reviewStatus;
    res.json({
      message: 'Можно изменить даты и данные практики и снова отправить анкету на проверку',
      ...profile,
      isProfileComplete: complete,
      canEdit: canStudentEditProfile(st),
      canSubmitForReview: canStudentSubmitForReview(st, complete),
      canStartNewProductionPractice: false,
    });
  }
);

router.put(
  '/me',
  authenticate,
  requireStudentRole,
  studentProfileUpdateValidators,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const existing = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!existing) {
      res.status(404).json({ error: 'Профиль студента не найден' });
      return;
    }
    if (!canStudentEditProfile(existing.reviewStatus)) {
      res.status(409).json({
        error: 'Редактирование анкеты недоступно в текущем статусе',
        reviewStatus: existing.reviewStatus,
      });
      return;
    }

    const data = placementDataFromBody(req.body);
    const g = await prisma.group.findUnique({ where: { id: data.groupId } });
    if (!g) {
      res.status(400).json({ error: 'Некорректная группа' });
      return;
    }
    if (data.organizationId != null) {
      const o = await prisma.organization.findUnique({ where: { id: data.organizationId } });
      if (!o) {
        res.status(400).json({ error: 'Некорректная организация из справочника' });
        return;
      }
    }

    const profile = await prisma.studentProfile.update({
      where: { userId: req.user!.id },
      data,
      include: { group: true, organization: true },
    });

    const complete = isStudentProfileComplete(profile);
    const st = profile.reviewStatus;
    res.json({
      ...profile,
      isProfileComplete: complete,
      canEdit: canStudentEditProfile(st),
      canSubmitForReview: canStudentSubmitForReview(st, complete),
      canStartNewProductionPractice: st === 'APPROVED',
    });
  }
);

router.post('/me/submit', authenticate, requireStudentRole, async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
  if (!existing) {
    res.status(404).json({ error: 'Профиль студента не найден' });
    return;
  }
  const complete = isStudentProfileComplete(existing);
  if (!canStudentSubmitForReview(existing.reviewStatus, complete)) {
    res.status(409).json({
      error: complete
        ? 'Отправка на проверку недоступна в текущем статусе'
        : 'Заполните все поля анкеты перед отправкой',
      reviewStatus: existing.reviewStatus,
      isProfileComplete: complete,
    });
    return;
  }

  const profile = await prisma.studentProfile.update({
    where: { userId: req.user!.id },
    data: {
      reviewStatus: 'PENDING_REVIEW',
      rejectionReason: null,
    },
    include: { group: true, organization: true },
  });

  res.json({
    message: 'Данные отправлены на проверку методисту/администратору',
    ...profile,
    isProfileComplete: true,
    canEdit: false,
    canSubmitForReview: false,
    canStartNewProductionPractice: false,
  });
});

// ——— Модерация ———

router.get('/moderation/pending', authenticate, requireModerator, async (_req: AuthRequest, res: Response): Promise<void> => {
  const list = await prisma.studentProfile.findMany({
    where: { reviewStatus: 'PENDING_REVIEW' },
    include: {
      user: { select: { id: true, email: true, name: true } },
      group: true,
      organization: true,
    },
    orderBy: { updatedAt: 'asc' },
  });
  res.json(list);
});

router.get('/moderation/:userId', authenticate, requireModerator, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId)) {
    res.status(400).json({ error: 'Некорректный идентификатор' });
    return;
  }
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, email: true, name: true, role: true } },
      group: true,
      organization: true,
      reviewedBy: { select: { id: true, name: true, email: true } },
    },
  });
  if (!profile || profile.user.role !== 'STUDENT') {
    res.status(404).json({ error: 'Анкета не найдена' });
    return;
  }
  res.json({
    ...profile,
    isProfileComplete: isStudentProfileComplete(profile),
  });
});

async function ensureStudentRecord(userId: number, fio: string, groupId: number) {
  const existing = await prisma.student.findUnique({ where: { userId } });
  if (existing) {
    return prisma.student.update({
      where: { id: existing.id },
      data: { fio, groupId },
    });
  }
  return prisma.student.create({
    data: { fio, groupId, userId },
  });
}

router.post(
  '/moderation/:userId/review',
  authenticate,
  requireModerator,
  [
    body('decision').isIn(['approve', 'reject']).withMessage('decision: approve или reject'),
    body('rejectionReason')
      .if(body('decision').equals('reject'))
      .trim()
      .notEmpty()
      .withMessage('Укажите причину отклонения'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      res.status(400).json({ error: 'Некорректный идентификатор' });
      return;
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      include: { user: { select: { role: true } } },
    });
    if (!profile || profile.user.role !== 'STUDENT') {
      res.status(404).json({ error: 'Анкета не найдена' });
      return;
    }
    if (profile.reviewStatus !== 'PENDING_REVIEW') {
      res.status(409).json({
        error: 'Можно обрабатывать только анкеты в статусе «На проверке»',
        reviewStatus: profile.reviewStatus,
      });
      return;
    }

    const moderatorId = req.user!.id;
    const now = new Date();

    if (req.body.decision === 'reject') {
      const updated = await prisma.studentProfile.update({
        where: { userId },
        data: {
          reviewStatus: 'REJECTED',
          reviewedById: moderatorId,
          reviewedAt: now,
          rejectionReason: String(req.body.rejectionReason).trim(),
        },
        include: { user: { select: { id: true, email: true, name: true } }, group: true, organization: true },
      });
      res.json(updated);
      return;
    }

    if (!isStudentProfileComplete(profile)) {
      res.status(409).json({ error: 'Анкета не заполнена полностью' });
      return;
    }

    const fio = profile.fio!.trim();
    const groupId = profile.groupId!;

    await prisma.studentProfile.update({
      where: { userId },
      data: {
        reviewStatus: 'APPROVED',
        reviewedById: moderatorId,
        reviewedAt: now,
        rejectionReason: null,
      },
    });

    await ensureStudentRecord(userId, fio, groupId);

    const finalProfile = await prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        group: true,
        organization: true,
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(finalProfile);
  }
);

export default router;
