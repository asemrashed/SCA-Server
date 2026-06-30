/**
 * One-time migration: download Cloudinary-hosted files and rewrite DB URLs to local VPS storage.
 *
 * Prerequisites:
 *   UPLOAD_DIR and PUBLIC_UPLOAD_BASE_URL set in .env (same as production)
 *
 *   npm run db:migrate:cloudinary-to-local
 *   npm run db:migrate:cloudinary-to-local -- --dry-run
 */
import '../../src/load-env.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { localKeyFromCloudinaryUrl, saveLocalFile } from '../../src/lib/storage.js'
import { publicUploadBaseUrl, uploadDir } from '../../src/config/env.js'

const prisma = new PrismaClient()
const dryRun = process.argv.includes('--dry-run')

type UrlRef = {
  table: string
  column: string
  idColumn: string
}

const URL_REFS: UrlRef[] = [
  { table: 'User', column: 'avatarUrl', idColumn: 'id' },
  { table: 'Category', column: 'image', idColumn: 'id' },
  { table: 'Course', column: 'thumbnail', idColumn: 'id' },
  { table: 'Batch', column: 'thumbnail', idColumn: 'id' },
  { table: 'Lesson', column: 'videoUrl', idColumn: 'id' },
  { table: 'Resource', column: 'fileUrl', idColumn: 'id' },
  { table: 'ResourceSubmission', column: 'resultFileUrl', idColumn: 'id' },
  { table: 'Recording', column: 'videoUrl', idColumn: 'id' },
  { table: 'Product', column: 'thumbnail', idColumn: 'id' },
  { table: 'Product', column: 'digitalUrl', idColumn: 'id' },
]

function isCloudinaryUrl(url: string): boolean {
  return url.includes('res.cloudinary.com')
}

async function collectCloudinaryUrls(): Promise<Map<string, { table: string; column: string; id: string }[]>> {
  const byUrl = new Map<string, { table: string; column: string; idColumn: string; id: string }[]>()

  for (const ref of URL_REFS) {
    const rows = await prisma.$queryRawUnsafe<{ id: string; value: string }[]>(
      `SELECT "${ref.idColumn}" AS id, "${ref.column}" AS value
       FROM "${ref.table}"
       WHERE "${ref.column}" IS NOT NULL
         AND "${ref.column}" LIKE '%res.cloudinary.com%'`,
    )

    for (const row of rows) {
      const url = row.value.trim()
      if (!isCloudinaryUrl(url)) continue
      const list = byUrl.get(url) ?? []
      list.push({ table: ref.table, column: ref.column, idColumn: ref.idColumn, id: row.id })
      byUrl.set(url, list)
    }
  }

  return byUrl
}

async function downloadFile(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`)
  }
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

async function migrateUrl(oldUrl: string): Promise<string> {
  const key = localKeyFromCloudinaryUrl(oldUrl)
  if (!key) {
    throw new Error(`Cannot parse Cloudinary path: ${oldUrl}`)
  }

  const dest = path.join(uploadDir(), key)
  const newUrl = `${publicUploadBaseUrl()}/${key.split('/').map(encodeURIComponent).join('/')}`

  try {
    await fs.access(dest)
    console.info(`  skip (exists): ${key}`)
    return newUrl
  } catch {
    // download
  }

  if (dryRun) {
    console.info(`  dry-run download: ${oldUrl} -> ${key}`)
    return newUrl
  }

  const data = await downloadFile(oldUrl)
  await saveLocalFile(key, data)
  console.info(`  saved: ${key} (${data.length} bytes)`)
  return newUrl
}

async function updateReferences(
  refs: { table: string; column: string; idColumn: string; id: string }[],
  oldUrl: string,
  newUrl: string,
): Promise<void> {
  if (dryRun) return

  for (const ref of refs) {
    await prisma.$executeRawUnsafe(
      `UPDATE "${ref.table}"
       SET "${ref.column}" = $1
       WHERE "${ref.idColumn}" = $2 AND "${ref.column}" = $3`,
      newUrl,
      ref.id,
      oldUrl,
    )
  }
}

async function main(): Promise<void> {
  if (!process.env.PUBLIC_UPLOAD_BASE_URL) {
    throw new Error('Set PUBLIC_UPLOAD_BASE_URL in .env before running this migration')
  }

  console.info(`Upload dir: ${uploadDir()}`)
  console.info(`Public base: ${publicUploadBaseUrl()}`)
  console.info(dryRun ? 'DRY RUN — no files or DB rows will change\n' : '')

  const byUrl = await collectCloudinaryUrls()
  console.info(`Found ${byUrl.size} unique Cloudinary URL(s)\n`)

  if (byUrl.size === 0) {
    console.info('Nothing to migrate.')
    return
  }

  let ok = 0
  let failed = 0

  for (const [oldUrl, refs] of byUrl) {
    console.info(`Migrating (${refs.length} ref(s)): ${oldUrl}`)
    try {
      const newUrl = await migrateUrl(oldUrl)
      await updateReferences(refs, oldUrl, newUrl)
      ok += 1
    } catch (err) {
      failed += 1
      console.error(`  FAILED: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  console.info(`\nDone: ${ok} migrated, ${failed} failed`)
  if (failed > 0) process.exitCode = 1
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
