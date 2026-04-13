import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SURNAMES = [
  'Алексеев',
  'Борисов',
  'Васильев',
  'Григорьев',
  'Денисов',
  'Егоров',
  'Жуков',
  'Зайцев',
  'Иванов',
  'Козлов',
  'Лебедев',
  'Морозов',
  'Николаев',
  'Орлов',
  'Павлов',
];

const GIVEN = [
  'Александр',
  'Дмитрий',
  'Максим',
  'Сергей',
  'Андрей',
  'Алексей',
  'Иван',
  'Кирилл',
  'Михаил',
  'Никита',
  'Анна',
  'Мария',
  'Елена',
  'Ольга',
  'Татьяна',
  'Светлана',
  'Ирина',
  'Екатерина',
  'Наталья',
  'Юлия',
];

const PATRONYMICS = [
  'Александрович',
  'Борисович',
  'Викторович',
  'Дмитриевич',
  'Евгеньевич',
  'Игоревич',
  'Павлович',
  'Сергеевич',
  'Александровна',
  'Борисовна',
  'Викторовна',
  'Дмитриевна',
  'Игоревна',
  'Павловна',
  'Сергеевна',
];

async function main() {
  const sup1 = await getOrCreateTechSupervisor({
    fio: 'Николаев Алексей Борисович',
    position: 'Преподаватель',
    phone: '+7 (926) 111-22-33',
  });

  const sup2 = await getOrCreateTechSupervisor({
    fio: 'Морозова Елена Викторовна',
    position: 'Старший преподаватель',
    phone: '+7 (926) 444-55-66',
  });

  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@mpt.ru' },
    update: {},
    create: {
      email: 'admin@mpt.ru',
      password: hashedPassword,
      name: 'Администратор',
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'methodist@mpt.ru' },
    update: { techSupervisorId: sup1.id },
    create: {
      email: 'methodist@mpt.ru',
      password: await bcrypt.hash('methodist123', 10),
      name: 'Методист',
      role: 'METHODIST',
      techSupervisorId: sup1.id,
    },
  });

  const mod1 = await prisma.module.upsert({
    where: { moduleIndex: 'МДК.01.01' },
    update: {},
    create: { moduleIndex: 'МДК.01.01', moduleName: 'Разработка программных модулей' },
  });

  const mod2 = await prisma.module.upsert({
    where: { moduleIndex: 'МДК.02.01' },
    update: {},
    create: { moduleIndex: 'МДК.02.01', moduleName: 'Технология разработки ПО' },
  });

  const prac1 = await prisma.practice.upsert({
    where: { practiceIndex: 'ПП.01.01' },
    update: {},
    create: {
      practiceIndex: 'ПП.01.01',
      practiceName: 'Производственная практика',
      moduleId: mod1.id,
      periodStart: new Date('2026-06-01'),
      periodEnd: new Date('2026-06-28'),
    },
  });

  const prac2 = await prisma.practice.upsert({
    where: { practiceIndex: 'УП.01.01' },
    update: {},
    create: {
      practiceIndex: 'УП.01.01',
      practiceName: 'Учебная практика',
      moduleId: mod2.id,
      periodStart: new Date('2026-04-01'),
      periodEnd: new Date('2026-04-20'),
    },
  });

  // Сброс демо-данных по студентам / группам / организациям / назначениям
  await prisma.studentPracticeAssignment.deleteMany();
  await prisma.student.deleteMany();
  await prisma.studentProfile.updateMany({ data: { groupId: null, organizationId: null } });
  await prisma.group.deleteMany();
  await prisma.organization.deleteMany();

  const orgsPayload = [
    {
      name: 'ООО «ТехноСофт»',
      address: 'г. Москва, ул. Ленина, д. 10',
      email: 'hr@technosoft.ru',
      phone: '+7 (495) 123-45-67',
      supervisorOrgFio: 'Иванов Иван Иванович',
      supervisorOrgPosition: 'Генеральный директор',
      practiceResponsibleFio: 'Петрова Анна Сергеевна',
      practiceResponsiblePosition: 'HR-менеджер',
      practiceResponsiblePhone: '+7 (495) 123-45-68',
      timeToNearestMetroMin: 10,
    },
    {
      name: 'АО «ИнфоСистемы»',
      address: 'г. Москва, пр. Мира, д. 25',
      email: 'info@infosys.ru',
      phone: '+7 (495) 987-65-43',
      supervisorOrgFio: 'Сидоров Пётр Николаевич',
      supervisorOrgPosition: 'Директор',
      practiceResponsibleFio: 'Козлова Мария Владимировна',
      practiceResponsiblePosition: 'Ведущий специалист',
      practiceResponsiblePhone: '+7 (495) 987-65-44',
      timeToNearestMetroMin: 5,
    },
    {
      name: 'ООО «Цифровые решения»',
      address: 'г. Москва, наб. Тараса Шевченко, д. 7',
      email: 'office@digital-sol.ru',
      phone: '+7 (495) 222-33-44',
      supervisorOrgFio: 'Волков Артём Сергеевич',
      supervisorOrgPosition: 'Управляющий',
      practiceResponsibleFio: 'Соколова Елена Дмитриевна',
      practiceResponsiblePosition: 'Руководитель практик',
      practiceResponsiblePhone: '+7 (495) 222-33-45',
      timeToNearestMetroMin: 12,
    },
    {
      name: 'ПАО «НейроТех»',
      address: 'г. Москва, ул. Профсоюзная, д. 100',
      email: 'practice@neurotech.ru',
      phone: '+7 (495) 333-44-55',
      supervisorOrgFio: 'Кузнецов Олег Викторович',
      supervisorOrgPosition: 'Председатель правления',
      practiceResponsibleFio: 'Новикова Ирина Павловна',
      practiceResponsiblePosition: 'Куратор практик',
      practiceResponsiblePhone: '+7 (495) 333-44-56',
      timeToNearestMetroMin: 8,
    },
    {
      name: 'ООО «ОблакоКод»',
      address: 'г. Москва, ул. Тимура Фрунзе, д. 11',
      email: 'hr@oblakokod.ru',
      phone: '+7 (495) 444-55-66',
      supervisorOrgFio: 'Фёдоров Никита Андреевич',
      supervisorOrgPosition: 'Генеральный директор',
      practiceResponsibleFio: 'Романова Светлана Игоревна',
      practiceResponsiblePosition: 'Специалист по кадрам',
      practiceResponsiblePhone: '+7 (495) 444-55-67',
      timeToNearestMetroMin: 15,
    },
  ];

  const orgs = await Promise.all(
    orgsPayload.map((data) => prisma.organization.create({ data }))
  );

  const groupDefs: { groupName: string; groupIndex: string }[] = [];
  for (let n = 1; n <= 4; n++) groupDefs.push({ groupName: `Э-${n}-22`, groupIndex: 'Э' });
  for (let n = 1; n <= 4; n++) groupDefs.push({ groupName: `П-${n}-23`, groupIndex: 'П' });
  for (let n = 1; n <= 4; n++) groupDefs.push({ groupName: `ИП-${n}-24`, groupIndex: 'ИП' });

  const createdGroups = await Promise.all(
    groupDefs.map((d) => prisma.group.create({ data: d }))
  );

  let studentCounter = 0;
  const studentRows = createdGroups.flatMap((g) =>
    Array.from({ length: 10 }, (_, i) => {
      const k = studentCounter++;
      return {
        fio: `${SURNAMES[k % SURNAMES.length]} ${GIVEN[(k * 3) % GIVEN.length]} ${PATRONYMICS[(k * 5) % PATRONYMICS.length]}`,
        groupId: g.id,
      };
    })
  );

  await prisma.student.createMany({ data: studentRows });

  const students = await prisma.student.findMany({
    where: { groupId: { in: createdGroups.map((x) => x.id) } },
    orderBy: [{ groupId: 'asc' }, { id: 'asc' }],
  });

  // Все назначения на sup1 — у методиста methodist@mpt в интерфейсе видны все студенты
  for (let i = 0; i < students.length; i++) {
    const org = orgs[i % orgs.length];
    await prisma.studentPracticeAssignment.create({
      data: {
        studentId: students[i].id,
        practiceId: prac1.id,
        organizationId: org.id,
        techSupervisorId: sup1.id,
        orgSupervisorFio: org.practiceResponsibleFio,
      },
    });
    await prisma.studentPracticeAssignment.create({
      data: {
        studentId: students[i].id,
        practiceId: prac2.id,
        organizationId: orgs[(i + 2) % orgs.length].id,
        techSupervisorId: sup1.id,
        orgSupervisorFio: orgs[(i + 2) % orgs.length].practiceResponsibleFio,
      },
    });
  }

  console.log(
    `Seed OK: организаций ${orgs.length}, групп ${createdGroups.length}, студентов ${students.length}, назначений ${students.length * 2}`
  );
}

async function getOrCreateTechSupervisor(data: { fio: string; position: string; phone: string }) {
  const existing = await prisma.techSupervisor.findFirst({
    where: { fio: data.fio, phone: data.phone },
  });
  if (existing) return existing;
  return prisma.techSupervisor.create({ data });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
