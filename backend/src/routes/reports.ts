import { Router, Response } from 'express';
import ExcelJS from 'exceljs';
import type { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { effectiveGroupIndex } from '../utils/groupIndex';
import { loadGroupIndexLabelMap, exportLabelFromMap, specialtiesLineFromMap } from '../utils/groupIndexLabelMap';
import { authenticate, requireModerator, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(requireModerator);

function methodistAssignmentWhere(req: AuthRequest): Prisma.StudentPracticeAssignmentWhereInput {
  if (req.user?.role === 'METHODIST' && req.user.techSupervisorId) {
    return { techSupervisorId: req.user.techSupervisorId };
  }
  return {};
}

async function groupIdsMatchingEffectiveIndex(index: string): Promise<number[]> {
  const trimmed = index.trim();
  if (!trimmed) return [];
  const groups = await prisma.group.findMany({
    select: { id: true, groupName: true, groupIndex: true },
  });
  return groups.filter((g) => effectiveGroupIndex(g) === trimmed).map((g) => g.id);
}

/** Индексы направлений из справочника администратора (group_index_labels), без выведенных из названий групп «лишних» букв. */
router.get('/group-indices', async (_req: AuthRequest, res: Response): Promise<void> => {
  const rows = await prisma.groupIndexLabel.findMany({
    select: { indexKey: true },
  });
  const keys = [...new Set(rows.map((r) => r.indexKey.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'ru')
  );
  res.json(keys);
});

router.get('/export', async (req: AuthRequest, res: Response): Promise<void> => {
  const labelMap = await loadGroupIndexLabelMap();
  const { organizationId, groupId, groupIndex: groupIndexQ } = req.query;
  const roleWhere = methodistAssignmentWhere(req);

  let studentFilter: Prisma.StudentWhereInput | undefined;
  if (groupId) {
    studentFilter = { groupId: Number(groupId) };
  } else if (typeof groupIndexQ === 'string' && groupIndexQ.trim()) {
    const ids = await groupIdsMatchingEffectiveIndex(groupIndexQ.trim());
    studentFilter = { groupId: { in: ids.length > 0 ? ids : [-1] } };
  }

  const assignmentWhere: Prisma.StudentPracticeAssignmentWhereInput = {
    ...roleWhere,
    ...(studentFilter ? { student: studentFilter } : {}),
  };

  const organizations = await prisma.organization.findMany({
    where: organizationId ? { id: Number(organizationId) } : {},
    include: {
      assignments: {
        where: assignmentWhere,
        include: {
          student: { include: { group: true } },
          practice: { include: { module: true } },
          techSupervisor: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MPT Practic System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Организации и назначения', {
    pageSetup: { fitToPage: true, orientation: 'landscape' },
  });

  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    },
  };

  sheet.columns = [
    { header: 'ID организации', key: 'orgId', width: 14 },
    { header: 'Название организации', key: 'orgName', width: 30 },
    { header: 'Адрес', key: 'address', width: 35 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Телефон организации', key: 'phone', width: 22 },
    { header: 'Должность руководителя от организации', key: 'supervisorOrgPosition', width: 30 },
    { header: 'ФИО руководителя от организации', key: 'supervisorOrgFio', width: 30 },
    { header: 'ФИО ответственного за практику', key: 'practiceResponsibleFio', width: 30 },
    { header: 'Должность ответственного', key: 'practiceResponsiblePosition', width: 28 },
    { header: 'Телефон ответственного', key: 'practiceResponsiblePhone', width: 22 },
    { header: 'Время до метро/МЦД (мин.)', key: 'timeToMetro', width: 22 },
    { header: 'ФИО студента', key: 'studentFio', width: 30 },
    { header: 'Группа', key: 'groupName', width: 14 },
    { header: 'Код специальности (индекс)', key: 'qualificationIndex', width: 22 },
    { header: 'Индекс ПП', key: 'practiceIndex', width: 12 },
    { header: 'Название практики', key: 'practiceName', width: 28 },
    { header: 'Индекс модуля', key: 'moduleIndex', width: 14 },
    { header: 'Название модуля', key: 'moduleName', width: 28 },
    { header: 'Период (с)', key: 'periodStart', width: 14 },
    { header: 'Период (по)', key: 'periodEnd', width: 14 },
    { header: 'Руководитель от техникума', key: 'techSupervisorFio', width: 30 },
    { header: 'Должность рук. от техникума', key: 'techSupervisorPosition', width: 26 },
    { header: 'Телефон рук. от техникума', key: 'techSupervisorPhone', width: 22 },
    { header: 'Руководитель от организации (ФИО)', key: 'orgSupervisorFio', width: 30 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.height = 40;
  sheet.columns.forEach((_, colIdx) => {
    const cell = headerRow.getCell(colIdx + 1);
    Object.assign(cell, headerStyle);
    if (headerStyle.font) cell.font = headerStyle.font;
    if (headerStyle.fill) cell.fill = headerStyle.fill as ExcelJS.Fill;
    if (headerStyle.alignment) cell.alignment = headerStyle.alignment;
    if (headerStyle.border) cell.border = headerStyle.border;
  });

  const cellStyle: Partial<ExcelJS.Style> = {
    border: {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    },
    alignment: { vertical: 'middle', wrapText: true },
  };

  let rowIndex = 2;
  for (const org of organizations) {
    if (org.assignments.length === 0) {
      const row = sheet.getRow(rowIndex);
      row.values = [
        org.id, org.name, org.address, org.email, org.phone,
        org.supervisorOrgPosition, org.supervisorOrgFio,
        org.practiceResponsibleFio, org.practiceResponsiblePosition,
        org.practiceResponsiblePhone, org.timeToNearestMetroMin,
        '—', '—', '—', '—', '—', '—', '—', '—', '—', '—', '—', '—', '—',
      ];
      applyRowStyle(row, cellStyle, rowIndex % 2 === 0);
      rowIndex++;
    } else {
      for (const a of org.assignments) {
        const row = sheet.getRow(rowIndex);
        const gIdx = effectiveGroupIndex(a.student.group);
        row.values = [
          org.id, org.name, org.address, org.email, org.phone,
          org.supervisorOrgPosition, org.supervisorOrgFio,
          org.practiceResponsibleFio, org.practiceResponsiblePosition,
          org.practiceResponsiblePhone, org.timeToNearestMetroMin,
          a.student.fio, a.student.group.groupName,
          exportLabelFromMap(labelMap, gIdx),
          a.practice.practiceIndex, a.practice.practiceName,
          a.practice.module.moduleIndex, a.practice.module.moduleName,
          formatDate(a.practice.periodStart), formatDate(a.practice.periodEnd),
          a.techSupervisor.fio, a.techSupervisor.position, a.techSupervisor.phone,
          a.orgSupervisorFio,
        ];
        applyRowStyle(row, cellStyle, rowIndex % 2 === 0);
        rowIndex++;
      }
    }
  }

  sheet.autoFilter = { from: 'A1', to: `X${rowIndex - 1}` };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const date = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="practice_export_${date}.xlsx"`);

  await workbook.xlsx.write(res);
  res.end();
});

/** Формат «Базы практик … для студентов»: шапка + 6 колонок как в образце. */
router.get('/export/student-bases', async (req: AuthRequest, res: Response): Promise<void> => {
  const labelMap = await loadGroupIndexLabelMap();
  const { organizationId, practiceId, groupId, groupIndex: groupIndexQ } = req.query;
  const roleWhere = methodistAssignmentWhere(req);

  const studentWhere: Prisma.StudentWhereInput = {};
  if (groupId) {
    studentWhere.groupId = Number(groupId);
  } else if (typeof groupIndexQ === 'string' && groupIndexQ.trim()) {
    const ids = await groupIdsMatchingEffectiveIndex(groupIndexQ.trim());
    studentWhere.groupId = { in: ids.length > 0 ? ids : [-1] };
  }

  const where: Prisma.StudentPracticeAssignmentWhereInput = {
    ...roleWhere,
    ...(organizationId ? { organizationId: Number(organizationId) } : {}),
    ...(practiceId ? { practiceId: Number(practiceId) } : {}),
    ...(Object.keys(studentWhere).length ? { student: studentWhere } : {}),
  };

  const assignments = await prisma.studentPracticeAssignment.findMany({
    where,
    include: {
      student: { include: { group: true } },
      practice: { include: { module: true } },
      organization: true,
      techSupervisor: true,
    },
    orderBy: [{ organization: { name: 'asc' } }, { student: { fio: 'asc' } }],
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'MPT Practic System';
  const sheet = wb.addWorksheet('Базы практик', {
    pageSetup: { orientation: 'landscape', fitToPage: true },
  });

  const titleStyle: Partial<ExcelJS.Style> = {
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    font: { name: 'Times New Roman', bold: true, size: 12 },
  };

  const first = assignments[0];
  const line1 = first
    ? `Базы производственной практики (по профилю специальности)\n${first.practice.practiceIndex} «${first.practice.practiceName}» профессионального модуля ${first.practice.module.moduleIndex} «${first.practice.module.moduleName}»`
    : 'Базы производственной практики (по данным учёта назначений)';

  const groups = [...new Set(assignments.map((a) => a.student.group.groupName))].sort().join(', ');
  const line3 = groups ? `Групп: ${groups}` : 'Групп: —';

  let line4 = 'период проведения: —';
  if (assignments.length > 0) {
    const t0 = Math.min(...assignments.map((a) => new Date(a.practice.periodStart).getTime()));
    const t1 = Math.max(...assignments.map((a) => new Date(a.practice.periodEnd).getTime()));
    const d0 = new Date(t0);
    const d1 = new Date(t1);
    const chunk = (d: Date) =>
      `«${d.getDate()}» ${d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}`;
    line4 = `период проведения: с ${chunk(d0)} по ${chunk(d1)}`;
  }

  const indicesInExport = assignments.map((a) => effectiveGroupIndex(a.student.group));
  const line2 = specialtiesLineFromMap(labelMap, indicesInExport);

  for (let r = 1; r <= 4; r++) {
    sheet.mergeCells(`A${r}:F${r}`);
    const cell = sheet.getCell(r, 1);
    cell.style = { ...titleStyle };
    if (r === 1) cell.value = line1;
    if (r === 2) cell.value = line2;
    if (r === 3) cell.value = line3;
    if (r === 4) cell.value = line4;
    sheet.getRow(r).height = r === 1 ? 48 : 22;
  }

  const headerRow = 5;
  const headers = [
    '№ п/п',
    'Наименование организации',
    'Ф.И.О. студента',
    'Группа',
    'Руководитель практической подготовки от техникума',
    'Руководитель практической подготовки от организации',
  ];
  const hRow = sheet.getRow(headerRow);
  hRow.height = 36;
  headers.forEach((text, i) => {
    const cell = hRow.getCell(i + 1);
    cell.value = text;
    cell.font = { name: 'Times New Roman', bold: true, size: 12 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
  sheet.getColumn(1).width = 8;
  sheet.getColumn(2).width = 36;
  sheet.getColumn(3).width = 32;
  sheet.getColumn(4).width = 12;
  sheet.getColumn(5).width = 36;
  sheet.getColumn(6).width = 36;

  const dataStyle: Partial<ExcelJS.Style> = {
    font: { name: 'Times New Roman', size: 12 },
    border: {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    },
    alignment: { vertical: 'middle', wrapText: true },
  };

  let n = 1;
  let rowIdx = headerRow + 1;
  for (const a of assignments) {
    const row = sheet.getRow(rowIdx);
    row.values = [
      n++,
      a.organization.name,
      a.student.fio,
      a.student.group.groupName,
      a.techSupervisor.fio,
      a.orgSupervisorFio?.trim() ?? '—',
    ];
    applyRowStyle(row, dataStyle, rowIdx % 2 === 0);
    rowIdx++;
  }

  if (assignments.length === 0) {
    sheet.mergeCells(`A${rowIdx}:F${rowIdx}`);
    const c = sheet.getCell(rowIdx, 1);
    c.value = 'Нет назначений по выбранным условиям';
    c.font = { name: 'Times New Roman', size: 12 };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    rowIdx++;
  }

  sheet.autoFilter =
    assignments.length > 0
      ? { from: `A${headerRow}`, to: `F${rowIdx - 1}` }
      : undefined;
  sheet.views = [{ state: 'frozen', ySplit: headerRow }];

  const date = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="bazy_praktik_dlya_studentov_${date}.xlsx"`);

  await wb.xlsx.write(res);
  res.end();
});

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('ru-RU');
}

function applyRowStyle(
  row: ExcelJS.Row,
  style: Partial<ExcelJS.Style>,
  isEven: boolean
): void {
  row.height = 20;
  row.eachCell({ includeEmpty: true }, (cell) => {
    if (style.font) cell.font = style.font as ExcelJS.Font;
    if (style.border) cell.border = style.border as ExcelJS.Borders;
    if (style.alignment) cell.alignment = style.alignment;
    if (isEven) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } };
    }
  });
}

export default router;
