import prisma from '../utils/prisma';
import { isStudentProfileComplete } from '../utils/studentProfileLogic';

export type StudentAuthExtra = {
  reviewStatus: string;
  isProfileComplete: boolean;
  rejectionReason: string | null;
  canAccessAssignments: boolean;
};

export async function buildStudentAuthExtra(userId: number): Promise<StudentAuthExtra | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: true,
      linkedStudent: { select: { id: true } },
    },
  });
  if (!user?.studentProfile) return null;
  const p = user.studentProfile;
  const complete = isStudentProfileComplete(p);
  // После первого допуска запись Student остаётся — назначения доступны и при повторной подаче ПП (DRAFT/PENDING).
  return {
    reviewStatus: p.reviewStatus,
    isProfileComplete: complete,
    rejectionReason: p.rejectionReason,
    canAccessAssignments: user.linkedStudent != null,
  };
}
