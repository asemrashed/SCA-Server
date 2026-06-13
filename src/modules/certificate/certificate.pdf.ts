import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export interface CertificatePdfInput {
  studentName: string
  productTitle: string
  issuedAt: Date
  serial: string
  directorName?: string
}

const PAGE_WIDTH = 842
const PAGE_HEIGHT = 595

function formatCertificateDate(date: Date): string {
  const day = date.getDate()
  const suffix =
    day % 10 === 1 && day !== 11
      ? 'st'
      : day % 10 === 2 && day !== 12
        ? 'nd'
        : day % 10 === 3 && day !== 13
          ? 'rd'
          : 'th'
  const month = date.toLocaleDateString('en-GB', { month: 'long' })
  return `${day}${suffix} ${month} ${date.getFullYear()}`
}

function buildBodyText(studentName: string, productTitle: string): string {
  return `This certificate is awarded to ${studentName} in recognition of successful completion of ${productTitle}. We congratulate the recipient on this achievement with Sharif Commerce Academy.`
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars) {
      if (current) lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines
}

function templatePath(): string {
  return join(process.cwd(), 'assets/certificate-template.png')
}

export async function generateCertificatePdf(input: CertificatePdfInput): Promise<Buffer> {
  const templateBytes = readFileSync(templatePath())
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const png = await pdfDoc.embedPng(templateBytes)
  page.drawImage(png, { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT })

  const serif = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const serifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
  const script = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic)

  const bodyText = buildBodyText(input.studentName, input.productTitle)
  const bodyLines = wrapText(bodyText, 95)
  const dateLabel = formatCertificateDate(input.issuedAt)
  const director = input.directorName ?? 'Director, SCA'

  const nameWidth = serifBold.widthOfTextAtSize(input.studentName, 28)
  page.drawText(input.studentName, {
    x: (PAGE_WIDTH - nameWidth) / 2,
    y: 300,
    size: 28,
    font: script,
    color: rgb(0.1, 0.1, 0.1),
  })

  let bodyY = 235
  for (const line of bodyLines) {
    const lineWidth = serif.widthOfTextAtSize(line, 11)
    page.drawText(line, {
      x: (PAGE_WIDTH - lineWidth) / 2,
      y: bodyY,
      size: 11,
      font: serif,
      color: rgb(0.15, 0.15, 0.15),
    })
    bodyY -= 16
  }

  page.drawText(dateLabel, {
    x: 118,
    y: 98,
    size: 11,
    font: serif,
    color: rgb(0.1, 0.1, 0.1),
  })

  const sigWidth = script.widthOfTextAtSize(director, 14)
  page.drawText(director, {
    x: 620 - sigWidth / 2,
    y: 98,
    size: 14,
    font: script,
    color: rgb(0.1, 0.1, 0.1),
  })

  const serialText = `Serial: ${input.serial}`
  const serialWidth = serif.widthOfTextAtSize(serialText, 9)
  page.drawText(serialText, {
    x: (PAGE_WIDTH - serialWidth) / 2,
    y: 36,
    size: 9,
    font: serifBold,
    color: rgb(0.35, 0.35, 0.35),
  })

  const bytes = await pdfDoc.save()
  return Buffer.from(bytes)
}

export { formatCertificateDate, buildBodyText }
