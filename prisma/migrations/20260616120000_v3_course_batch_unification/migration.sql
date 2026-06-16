-- v3: Course/Batch unification (additive + data + finalize)

-- CreateEnum
CREATE TYPE "DeliveryMode" AS ENUM ('LIVE', 'RECORDED');

-- AlterEnum: VIDEO → RECORDED
ALTER TYPE "LessonType" RENAME VALUE 'VIDEO' TO 'RECORDED';

-- AlterTable Course
ALTER TABLE "Course" ADD COLUMN "deliveryMode" "DeliveryMode" NOT NULL DEFAULT 'RECORDED';
CREATE INDEX "Course_deliveryMode_idx" ON "Course"("deliveryMode");

-- AlterTable Batch (nullable until data step below)
ALTER TABLE "Batch" ADD COLUMN "courseId" TEXT;
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Batch_courseId_idx" ON "Batch"("courseId");

-- AlterTable Subject (nullable until data step below)
ALTER TABLE "Subject" ADD COLUMN "courseId" TEXT;
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Subject_courseId_idx" ON "Subject"("courseId");

-- CreateTable BatchContentGrant
CREATE TABLE "BatchContentGrant" (
    "id" TEXT NOT NULL,
    "grantingBatchId" TEXT NOT NULL,
    "receivingBatchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchContentGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BatchContentGrant_grantingBatchId_receivingBatchId_key" ON "BatchContentGrant"("grantingBatchId", "receivingBatchId");
CREATE INDEX "BatchContentGrant_receivingBatchId_idx" ON "BatchContentGrant"("receivingBatchId");

ALTER TABLE "BatchContentGrant" ADD CONSTRAINT "BatchContentGrant_grantingBatchId_fkey" FOREIGN KEY ("grantingBatchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BatchContentGrant" ADD CONSTRAINT "BatchContentGrant_receivingBatchId_fkey" FOREIGN KEY ("receivingBatchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable Lesson default
ALTER TABLE "Lesson" ALTER COLUMN "type" SET DEFAULT 'RECORDED';

-- ── Data migration: one LIVE course per existing batch ─────────────────────

DO $$
DECLARE
  b RECORD;
  new_course_id TEXT;
  new_slug TEXT;
  slug_suffix INT;
  is_published BOOLEAN;
BEGIN
  FOR b IN SELECT id, title, slug, thumbnail, status::text AS status FROM "Batch" WHERE "courseId" IS NULL LOOP
    new_slug := b.slug || '-program';
    slug_suffix := 0;
    WHILE EXISTS (SELECT 1 FROM "Course" WHERE slug = new_slug AND "deletedAt" IS NULL) LOOP
      slug_suffix := slug_suffix + 1;
      new_slug := b.slug || '-program-' || slug_suffix::text;
    END LOOP;

    new_course_id := 'c' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 24);
    is_published := b.status NOT IN ('DRAFT', 'CANCELLED');

    INSERT INTO "Course" (
      id, title, slug, description, thumbnail, category,
      "deliveryMode", "priceMinor", "isPublished", "createdAt", "updatedAt"
    ) VALUES (
      new_course_id,
      b.title,
      new_slug,
      'Live program migrated from batch "' || b.title || '"',
      b.thumbnail,
      NULL,
      'LIVE',
      0,
      is_published,
      NOW(),
      NOW()
    );

    UPDATE "Batch" SET "courseId" = new_course_id WHERE id = b.id;
    UPDATE "Subject" SET "courseId" = new_course_id WHERE "batchId" = b.id;
  END LOOP;
END $$;

UPDATE "Exam" e
SET "courseId" = b."courseId"
FROM "Batch" b
WHERE e."batchId" = b.id
  AND e."batchId" IS NOT NULL
  AND b."courseId" IS NOT NULL
  AND e."courseId" IS NULL;

UPDATE "Assignment" a
SET "courseId" = b."courseId"
FROM "Batch" b
WHERE a."batchId" = b.id
  AND a."batchId" IS NOT NULL
  AND b."courseId" IS NOT NULL
  AND a."courseId" IS NULL;

UPDATE "Resource" r
SET "courseId" = b."courseId"
FROM "Batch" b
WHERE r."batchId" = b.id
  AND r."batchId" IS NOT NULL
  AND b."courseId" IS NOT NULL
  AND r."courseId" IS NULL;

DELETE FROM "LiveSession" WHERE "batchId" IS NULL;

DELETE FROM "Exam" WHERE "courseId" IS NULL;
DELETE FROM "Assignment" WHERE "courseId" IS NULL;
DELETE FROM "Resource" WHERE "courseId" IS NULL;

-- ── Finalize: drop legacy columns and enforce NOT NULL ───────────────────────

ALTER TABLE "Subject" DROP CONSTRAINT "Subject_batchId_fkey";
DROP INDEX "Subject_batchId_idx";
ALTER TABLE "Subject" DROP COLUMN "batchId";
ALTER TABLE "Subject" ALTER COLUMN "courseId" SET NOT NULL;

ALTER TABLE "Batch" ALTER COLUMN "courseId" SET NOT NULL;

ALTER TABLE "Exam" DROP CONSTRAINT "Exam_batchId_fkey";
DROP INDEX "Exam_batchId_idx";
ALTER TABLE "Exam" DROP COLUMN "batchId";
ALTER TABLE "Exam" ALTER COLUMN "courseId" SET NOT NULL;

ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_batchId_fkey";
DROP INDEX "Assignment_batchId_idx";
ALTER TABLE "Assignment" DROP COLUMN "batchId";
ALTER TABLE "Assignment" ALTER COLUMN "courseId" SET NOT NULL;

ALTER TABLE "Resource" DROP CONSTRAINT "Resource_batchId_fkey";
DROP INDEX "Resource_batchId_idx";
ALTER TABLE "Resource" DROP COLUMN "batchId";
ALTER TABLE "Resource" ALTER COLUMN "courseId" SET NOT NULL;

ALTER TABLE "LiveSession" DROP CONSTRAINT "LiveSession_courseId_fkey";
DROP INDEX "LiveSession_courseId_idx";
ALTER TABLE "LiveSession" DROP COLUMN "courseId";
ALTER TABLE "LiveSession" ALTER COLUMN "batchId" SET NOT NULL;

ALTER TABLE "Recording" DROP CONSTRAINT "Recording_courseId_fkey";
DROP INDEX "Recording_courseId_idx";
ALTER TABLE "Recording" DROP COLUMN "courseId";
