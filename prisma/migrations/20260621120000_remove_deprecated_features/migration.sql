-- Remove deprecated features: exam/assignment system, online payments, progress tracking, instructor role, certificates

-- Drop tables with foreign key dependencies first
DROP TABLE IF EXISTS "ExamQuestion" CASCADE;
DROP TABLE IF EXISTS "ExamAttempt" CASCADE;
DROP TABLE IF EXISTS "Exam" CASCADE;
DROP TABLE IF EXISTS "Submission" CASCADE;
DROP TABLE IF EXISTS "Assignment" CASCADE;
DROP TABLE IF EXISTS "Question" CASCADE;
DROP TABLE IF EXISTS "LessonProgress" CASCADE;
DROP TABLE IF EXISTS "Payment" CASCADE;
DROP TABLE IF EXISTS "Certificate" CASCADE;
DROP TABLE IF EXISTS "BatchInstructor" CASCADE;

-- Remove progress column from Enrollment
ALTER TABLE "Enrollment" DROP COLUMN IF EXISTS "progressPct";

-- Remove INSTRUCTOR from Role enum (migrate any instructor users to ADMIN first)
UPDATE "User" SET "role" = 'ADMIN' WHERE "role" = 'INSTRUCTOR';

CREATE TYPE "Role_new" AS ENUM ('STUDENT', 'ADMIN', 'SUPER_ADMIN');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'STUDENT';
DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";

-- Drop unused enums
DROP TYPE IF EXISTS "QuestionType";
DROP TYPE IF EXISTS "ExamStatus";
DROP TYPE IF EXISTS "AttemptStatus";
DROP TYPE IF EXISTS "PaymentPurpose";
DROP TYPE IF EXISTS "PaymentStatus";
