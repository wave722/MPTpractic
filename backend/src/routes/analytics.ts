import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate, requireNotMethodist, requireNotStudent, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(requireNotStudent);
router.use(requireNotMethodist);

router.get('/dashboard', async (_req: AuthRequest, res: Response): Promise<void> => {
  const [
    totalStudents,
    totalOrganizations,
    totalPractices,
    totalSupervisors,
    totalAssignments,
    supervisorLoad,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.organization.count(),
    prisma.practice.count(),
    prisma.techSupervisor.count(),
    prisma.studentPracticeAssignment.count(),     
    prisma.techSupervisor.findMany({
      include: { _count: { select: { assignments: true } } },
      orderBy: { fio: 'asc' },
    }),
  ]);

  const supervisorStats = supervisorLoad.map((s) => ({
    id: s.id,
    fio: s.fio,
    position: s.position,
    phone: s.phone,
    studentCount: s._count.assignments,
  }));

  res.json({
    totalStudents,
    totalOrganizations,
    totalPractices,
    totalSupervisors,
    totalAssignments  ,
    supervisorStats,
  });
});

router.get('/supervisor-load', async (_req: AuthRequest, res: Response): Promise<void> => {
  const supervisors = await prisma.techSupervisor.findMany({
    include: {
      _count: { select: { assignments: true } },
      assignments: {
        include: {
          organization: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { fio: 'asc' },
  });

  const result = supervisors.map((s) => {
    const uniqueOrgs = new Map<number, string>();
    s.assignments.forEach((a) => {
      uniqueOrgs.set(a.organization.id, a.organization.name);
    });

    return {
      id: s.id,
      fio: s.fio,
      position: s.position,
      phone: s.phone,
      studentCount: s._count.assignments,
      organizations: Array.from(uniqueOrgs.entries()).map(([id, name]) => ({ id, name })),
    };
  });

  res.json(result);
});

export default router;
