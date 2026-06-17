-- LIVE curriculum: Subject belongs to Batch (not Course). RECORDED courses unchanged.

ALTER TABLE "Subject" ADD COLUMN "batchId" TEXT;

-- Assign existing subjects to the oldest batch per live course.
UPDATE "Subject" s
SET "batchId" = (
  SELECT b.id
  FROM "Batch" b
  WHERE b."courseId" = s."courseId"
    AND b."deletedAt" IS NULL
  ORDER BY b."createdAt" ASC
  LIMIT 1
)
WHERE s."batchId" IS NULL;

-- Orphan subjects (live course with no batch) — remove to satisfy NOT NULL.
DELETE FROM "Subject" WHERE "batchId" IS NULL;

ALTER TABLE "Subject" DROP CONSTRAINT IF EXISTS "Subject_courseId_fkey";
DROP INDEX IF EXISTS "Subject_courseId_idx";
ALTER TABLE "Subject" DROP COLUMN "courseId";

ALTER TABLE "Subject" ALTER COLUMN "batchId" SET NOT NULL;

ALTER TABLE "Subject"
  ADD CONSTRAINT "Subject_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Subject_batchId_idx" ON "Subject"("batchId");
