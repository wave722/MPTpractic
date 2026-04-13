-- AlterTable
ALTER TABLE "groups" ADD COLUMN "groupIndex" TEXT NOT NULL DEFAULT '';

-- Заполнить индекс из названия (часть до первого дефиса)
UPDATE "groups"
SET "groupIndex" = CASE
  WHEN instr("groupName", '-') > 0 THEN substr("groupName", 1, instr("groupName", '-') - 1)
  ELSE trim("groupName")
END
WHERE "groupIndex" = '';
