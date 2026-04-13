-- CreateTable
CREATE TABLE "group_index_labels" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "indexKey" TEXT NOT NULL,
    "exportLabel" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "group_index_labels_indexKey_key" ON "group_index_labels"("indexKey");
