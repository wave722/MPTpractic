import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string; name: string; techSupervisorId?: number | null };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Не авторизован' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthRequest['user'];
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Недействительный токен' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Недостаточно прав' });
    return;
  }
  next();
};

export const requireMethodist = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role === 'OBSERVER') {
    res.status(403).json({ error: 'Недостаточно прав' });
    return;
  }
  next();
};

export const requireNotMethodist = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role === 'METHODIST') {
    res.status(403).json({ error: 'Доступно только администратору/наблюдателю' });
    return;
  }
  next();
};

/** Админ-панель и отчёты: студенты не имеют доступа. */
export const requireNotStudent = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role === 'STUDENT') {
    res.status(403).json({ error: 'Недостаточно прав' });
    return;
  }
  next();
};

export const requireStudentRole = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'STUDENT') {
    res.status(403).json({ error: 'Доступно только студентам' });
    return;
  }
  next();
};

/** Модерация анкет: методист или администратор. */
export const requireModerator = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const r = req.user?.role;
  if (r !== 'METHODIST' && r !== 'ADMIN') {
    res.status(403).json({ error: 'Доступно только методисту или администратору' });
    return;
  }
  next();
};
