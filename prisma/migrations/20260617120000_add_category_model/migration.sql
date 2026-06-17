-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortIntro" TEXT,
    "image" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_slug_idx" ON "Category"("slug");

-- Add categoryId to Course
ALTER TABLE "Course" ADD COLUMN "categoryId" TEXT;

-- Migrate legacy free-text categories into Category rows
INSERT INTO "Category" ("id", "title", "slug", "shortIntro", "order", "createdAt", "updatedAt")
SELECT
    'cat_' || substr(md5(lower(trim(c.category))), 1, 22),
    trim(c.category),
    lower(regexp_replace(regexp_replace(trim(c.category), '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g')),
    NULL,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT category
    FROM "Course"
    WHERE category IS NOT NULL AND trim(category) <> ''
) c
ON CONFLICT ("slug") DO NOTHING;

UPDATE "Course" co
SET "categoryId" = cat."id"
FROM "Category" cat
WHERE co.category IS NOT NULL
  AND trim(co.category) <> ''
  AND cat.slug = lower(regexp_replace(regexp_replace(trim(co.category), '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'));

-- DropIndex
DROP INDEX IF EXISTS "Course_category_idx";

-- AlterTable
ALTER TABLE "Course" DROP COLUMN "category";

-- CreateIndex
CREATE INDEX "Course_categoryId_idx" ON "Course"("categoryId");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
