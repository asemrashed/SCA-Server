-- Question bank PDFs as resources; exams can link to question bank items

ALTER TYPE "ResourceCategory" ADD VALUE 'QUESTION_BANK';

ALTER TABLE "Resource" ADD COLUMN "marks" INTEGER;
ALTER TABLE "Resource" ADD COLUMN "linkedQuestionIds" JSONB;
