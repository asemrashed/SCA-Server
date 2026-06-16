/**
 * v3 data migration (optional re-run for dev repair).
 * Production data migration is embedded in
 * prisma/migrations/20260616120000_v3_course_batch_unification/migration.sql
 *
 *   npm run db:migrate:v3-data
 */
import { randomBytes } from 'node:crypto'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function newCuid(): string {
  const ts = Date.now().toString(36)
  const rand = randomBytes(8).toString('base64url')
  return `c${ts}${rand}`.slice(0, 25)
}

async function uniqueProgramSlug(baseSlug: string): Promise<string> {
  let slug = `${baseSlug}-program`
  let suffix = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Course" WHERE slug = ${slug} AND "deletedAt" IS NULL LIMIT 1
    `
    if (rows.length === 0) return slug
    suffix += 1
    slug = `${baseSlug}-program-${suffix}`
  }
}

async function main(): Promise<void> {
  const batches = await prisma.$queryRaw<
    { id: string; title: string; slug: string; thumbnail: string | null; status: string }[]
  >`
    SELECT id, title, slug, thumbnail, status::text AS status
    FROM "Batch"
    WHERE "courseId" IS NULL
  `

  console.log(`Migrating ${batches.length} batch(es) to parent courses…`)

  for (const batch of batches) {
    const slug = await uniqueProgramSlug(batch.slug)
    const isPublished = batch.status !== 'DRAFT' && batch.status !== 'CANCELLED'
    const courseId = newCuid()

    await prisma.$executeRaw`
      INSERT INTO "Course" (
        id, title, slug, description, thumbnail, category,
        "deliveryMode", "priceMinor", "isPublished",
        "createdAt", "updatedAt"
      ) VALUES (
        ${courseId},
        ${batch.title},
        ${slug},
        ${`Live program migrated from batch "${batch.title}"`},
        ${batch.thumbnail},
        NULL,
        'LIVE'::"DeliveryMode",
        0,
        ${isPublished},
        NOW(),
        NOW()
      )
    `

    await prisma.$executeRaw`
      UPDATE "Batch" SET "courseId" = ${courseId} WHERE id = ${batch.id}
    `

    const subjectResult = await prisma.$executeRaw`
      UPDATE "Subject" SET "courseId" = ${courseId} WHERE "batchId" = ${batch.id}
    `

    console.log(`  Batch ${batch.slug} → course ${slug} (${subjectResult} subjects updated)`)
  }

  await prisma.$executeRaw`
    UPDATE "Exam" e
    SET "courseId" = b."courseId"
    FROM "Batch" b
    WHERE e."batchId" = b.id
      AND e."batchId" IS NOT NULL
      AND b."courseId" IS NOT NULL
  `

  await prisma.$executeRaw`
    UPDATE "Assignment" a
    SET "courseId" = b."courseId"
    FROM "Batch" b
    WHERE a."batchId" = b.id
      AND a."batchId" IS NOT NULL
      AND b."courseId" IS NOT NULL
  `

  await prisma.$executeRaw`
    UPDATE "Resource" r
    SET "courseId" = b."courseId"
    FROM "Batch" b
    WHERE r."batchId" = b.id
      AND r."batchId" IS NOT NULL
      AND b."courseId" IS NOT NULL
  `

  const orphanSessions = await prisma.$executeRaw`
    DELETE FROM "LiveSession" WHERE "batchId" IS NULL
  `
  console.log(`Removed ${orphanSessions} live session(s) without batchId`)

  const batchesLeft = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "Batch" WHERE "courseId" IS NULL
  `
  if (Number(batchesLeft[0]?.count ?? 0) > 0) {
    throw new Error(`${batchesLeft[0]?.count} batch(es) still lack courseId`)
  }

  const subjectsLeft = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "Subject" WHERE "courseId" IS NULL
  `
  if (Number(subjectsLeft[0]?.count ?? 0) > 0) {
    throw new Error(`${subjectsLeft[0]?.count} subject(s) still lack courseId`)
  }

  console.log('V3 data migration complete. Safe to run finalize migration.')
}

main()
  .catch((err: unknown) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
