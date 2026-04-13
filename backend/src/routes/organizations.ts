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
  const orgs = await prisma.organization.findMany({ orderBy: { name: 'asc' } });
  res.json(orgs);
});

router.use(requireNotMethodist);
router.use(requireNotStudent);

const orgValidation = [
  body('name').notEmpty().withMessage('Название обязательно'),
  body('address').notEmpty().withMessage('Адрес обязателен'),
  body('email').isEmail().withMessage('Некорректный email'),
  body('phone').notEmpty().withMessage('Телефон обязателен'),
  body('supervisorOrgFio').notEmpty().withMessage('ФИО руководителя обязательно'),
  body('supervisorOrgPosition').notEmpty().withMessage('Должность руководителя обязательна'),
  body('practiceResponsibleFio').notEmpty().withMessage('ФИО ответственного обязательно'),
  body('practiceResponsiblePosition').notEmpty().withMessage('Должность ответственного обязательна'),
  body('practiceResponsiblePhone').notEmpty().withMessage('Телефон ответственного обязателен'),
  body('timeToNearestMetroMin')
    .isInt({ min: 1, max: 180 })
    .withMessage('Время до метро должно быть от 1 до 180 минут'),
];

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const org = await prisma.organization.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      assignments: {
        include: {
          student: { include: { group: true } },
          practice: { include: { module: true } },
          techSupervisor: true,
        },
      },
    },
  });
  if (!org) { res.status(404).json({ error: 'Организация не найдена' }); return; }
  res.json(org);
});

router.post('/', requireMethodist, orgValidation, async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

  const org = await prisma.organization.create({ data: req.body });
  res.status(201).json(org);
});

router.put('/:id', requireMethodist, orgValidation, async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

  const org = await prisma.organization.update({
    where: { id: Number(req.params.id) },
    data: req.body,
  });
  res.json(org);
});

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.organization.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

export default router;
