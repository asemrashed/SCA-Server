import { PDFDocument } from 'pdf-lib'
import { validationError } from '../../lib/errors.js'

function isEncryptedPdfError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === 'EncryptedPDFError' ||
      err.message.includes('encrypted') ||
      err.message.includes('password'))
  )
}

export async function extractPreviewPdf(fullBuffer: Buffer, previewPages: number): Promise<Buffer> {
  if (previewPages <= 0) {
    throw validationError('No preview pages configured for this product')
  }

  let srcDoc: PDFDocument
  try {
    srcDoc = await PDFDocument.load(fullBuffer, { ignoreEncryption: true })
  } catch (err) {
    if (isEncryptedPdfError(err)) {
      throw validationError(
        'This PDF is password-protected. Re-upload the file without a password to enable preview.',
      )
    }
    throw validationError('Preview could not be generated from this PDF')
  }

  const totalPages = srcDoc.getPageCount()
  if (totalPages === 0) {
    throw validationError('PDF has no pages')
  }

  const destDoc = await PDFDocument.create()
  const fullPages = Math.floor(previewPages)
  const partialFraction = previewPages - fullPages

  try {
    const fullPageCount = Math.min(fullPages, totalPages)
    if (fullPageCount > 0) {
      const copied = await destDoc.copyPages(
        srcDoc,
        Array.from({ length: fullPageCount }, (_, index) => index),
      )
      for (const page of copied) {
        destDoc.addPage(page)
      }
    }

    if (partialFraction > 0 && fullPages < totalPages) {
      const [page] = await destDoc.copyPages(srcDoc, [fullPages])
      const { width, height } = page.getSize()
      const visibleHeight = height * partialFraction
      page.setCropBox(0, height - visibleHeight, width, visibleHeight)
      destDoc.addPage(page)
    }
  } catch (err) {
    if (isEncryptedPdfError(err)) {
      throw validationError(
        'This PDF is password-protected. Re-upload the file without a password to enable preview.',
      )
    }
    throw validationError('Preview could not be generated from this PDF')
  }

  if (destDoc.getPageCount() === 0) {
    throw validationError('Preview could not be generated from this PDF')
  }

  return Buffer.from(await destDoc.save())
}
