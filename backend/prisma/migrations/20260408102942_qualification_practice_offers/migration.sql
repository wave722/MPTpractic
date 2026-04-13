-- CreateTable
CREATE TABLE "qualification_practice_offers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "groupIndexLabelId" INTEGER NOT NULL,
    "practiceId" INTEGER NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "qualification_practice_offers_groupIndexLabelId_fkey" FOREIGN KEY ("groupIndexLabelId") REFERENCES "group_index_labels" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "qualification_practice_offers_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "practices" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
