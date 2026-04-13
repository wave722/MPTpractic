import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { isAllowedStudentEmailDomain, STUDENT_EMAIL_DOMAIN_ERROR } from '../utils/studentEmail';
import { buildStudentAuthExtra } from '../services/studentAuthPayload';

const router = Router();

function signToken(user: { id: number; email: string; role: string; name: string; techSupervisorId: number | null }) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      techSupervisorId: user.techSupervisorId ?? null,
    },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );
}

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Некорректный email'),
    body('password').notEmpty().withMessage('Пароль обязателен'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const email = String(req.body.email).trim().toLowerCase();
    const { password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ error: 'Неверный email или пароль' });
      return;
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      techSupervisorId: user.techSupervisorId,
    });

    const studentAccess = user.role === 'STUDENT' ? await buildStudentAuthExtra(user.id) : undefined;

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      ...(studentAccess != null ? { studentAccess } : {}),
    });
  }
);

router.post(
  '/register-student',
  [
    body('email').isEmail().withMessage('Некорректный email'),
    body('password').isLength({ min: 8 }).withMessage('Пароль не короче 8 символов'),
    body('name').trim().notEmpty().withMessage('Имя обязательно'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const email = String(req.body.email).trim().toLowerCase();
    if (!isAllowedStudentEmailDomain(email)) {
      res.status(400).json({ error: STUDENT_EMAIL_DOMAIN_ERROR });
      return;
    }

    const password = String(req.body.password);
    const name = String(req.body.name).trim();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Пользователь с таким email уже зарегистрирован' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'STUDENT',
          studentProfile: { create: {} },
        },
      });

      const token = signToken({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        techSupervisorId: user.techSupervisorId,
      });

      const studentAccess = await buildStudentAuthExtra(user.id);

      res.status(201).json({
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        studentAccess: studentAccess ?? {
          reviewStatus: 'DRAFT',
          isProfileComplete: false,
          rejectionReason: null,
          canAccessAssignments: false,
        },
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Не удалось создать учётную запись' });
    }
  }
);

router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, name: true, role: true, techSupervisorId: true },
  });
  if (!user) {
    res.status(404).json({ error: 'Пользователь не найден' });
    return;
  }

  const studentAccess = user.role === 'STUDENT' ? await buildStudentAuthExtra(user.id) : undefined;

  res.json({
    ...user,
    ...(studentAccess != null ? { studentAccess } : {}),
  });
});

export default router;
