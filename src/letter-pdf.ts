import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib'
import { LETTERHEAD } from './letterhead'
import type { Endorsement, Item } from './schemas'

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const MARGIN_X = 40
const MARGIN_TOP = 32
const FOOTER_HEIGHT = 78
const CONTENT_BOTTOM = FOOTER_HEIGHT + 12
const GREEN = rgb(0, 0.65, 0.32)
const INK = rgb(0.08, 0.08, 0.08)

type Logos = {
  lgu: ArrayBuffer
  mdrrmo: ArrayBuffer
}

type PdfContext = {
  pdf: PDFDocument
  page: PDFPage
  font: PDFFont
  bold: PDFFont
  lgu: PDFImage
  mdrrmo: PDFImage
  y: number
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']

  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next
      continue
    }
    if (current) lines.push(current)
    current = word
  }

  if (current) lines.push(current)
  return lines
}

function drawCentered(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color = INK,
) {
  const width = font.widthOfTextAtSize(text, size)
  page.drawText(text, {
    x: (A4_WIDTH - width) / 2,
    y,
    size,
    font,
    color,
  })
}

function fitImage(image: PDFImage, max: number) {
  const scale = Math.min(max / image.width, max / image.height)
  return { width: image.width * scale, height: image.height * scale }
}

function ensureSpace(ctx: PdfContext, needed: number) {
  if (ctx.y - needed >= CONTENT_BOTTOM) return
  ctx.page = ctx.pdf.addPage([A4_WIDTH, A4_HEIGHT])
  drawPageChrome(ctx)
  ctx.y = A4_HEIGHT - MARGIN_TOP
}

function drawPageChrome(ctx: PdfContext) {
  const mark = fitImage(ctx.mdrrmo, 340)
  ctx.page.drawImage(ctx.mdrrmo, {
    x: (A4_WIDTH - mark.width) / 2,
    y: (A4_HEIGHT - mark.height) / 2 - 10,
    width: mark.width,
    height: mark.height,
    opacity: 0.06,
  })

  ctx.page.drawLine({
    start: { x: MARGIN_X, y: FOOTER_HEIGHT + 8 },
    end: { x: A4_WIDTH - MARGIN_X, y: FOOTER_HEIGHT + 8 },
    thickness: 2,
    color: GREEN,
  })

  drawCentered(ctx.page, LETTERHEAD.slogan, 58, ctx.bold, 11)

  let addressY = 44
  for (const line of LETTERHEAD.addressLines) {
    ctx.page.drawText(line, {
      x: MARGIN_X,
      y: addressY,
      size: 7,
      font: ctx.font,
      color: INK,
    })
    addressY -= 9
  }

  const email = `Email: ${LETTERHEAD.email}`
  const mobile = `Mobile No: ${LETTERHEAD.mobile}`
  ctx.page.drawText(email, {
    x: A4_WIDTH - MARGIN_X - ctx.font.widthOfTextAtSize(email, 7),
    y: 44,
    size: 7,
    font: ctx.font,
    color: INK,
  })
  ctx.page.drawText(mobile, {
    x: A4_WIDTH - MARGIN_X - ctx.font.widthOfTextAtSize(mobile, 7),
    y: 35,
    size: 7,
    font: ctx.font,
    color: INK,
  })
}

function drawHeader(ctx: PdfContext) {
  const lgu = fitImage(ctx.lgu, 62)
  const mdrrmo = fitImage(ctx.mdrrmo, 62)
  const headerTop = A4_HEIGHT - MARGIN_TOP

  ctx.page.drawImage(ctx.lgu, {
    x: MARGIN_X,
    y: headerTop - lgu.height,
    width: lgu.width,
    height: lgu.height,
  })
  ctx.page.drawImage(ctx.mdrrmo, {
    x: A4_WIDTH - MARGIN_X - mdrrmo.width,
    y: headerTop - mdrrmo.height,
    width: mdrrmo.width,
    height: mdrrmo.height,
  })

  let textY = headerTop - 10
  const headerLines: Array<{ text: string; size: number; bold?: boolean }> = [
    { text: LETTERHEAD.republic, size: 9 },
    { text: LETTERHEAD.province, size: 9 },
    { text: LETTERHEAD.municipality, size: 10, bold: true },
    { text: LETTERHEAD.council, size: 10, bold: true },
    { text: LETTERHEAD.office, size: 9 },
  ]

  for (const line of headerLines) {
    drawCentered(ctx.page, line.text, textY, line.bold ? ctx.bold : ctx.font, line.size)
    textY -= line.size + 3
  }

  ctx.y = Math.min(headerTop - lgu.height, textY) - 10
  ctx.page.drawLine({
    start: { x: MARGIN_X, y: ctx.y },
    end: { x: A4_WIDTH - MARGIN_X, y: ctx.y },
    thickness: 2.2,
    color: GREEN,
  })
  ctx.y -= 22
}

function drawMeta(ctx: PdfContext, letter: Endorsement) {
  drawCentered(ctx.page, letter.title, ctx.y, ctx.bold, 13)
  ctx.y -= 16
  for (const line of [letter.team, letter.date, letter.time]) {
    drawCentered(ctx.page, line, ctx.y, ctx.font, 11)
    ctx.y -= 14
  }
  ctx.y -= 4
}

const COLS = {
  item: { x: MARGIN_X, width: 214 },
  inQty: { x: MARGIN_X + 214, width: 70 },
  used: { x: MARGIN_X + 284, width: 70 },
  outQty: { x: MARGIN_X + 354, width: 70 },
  notes: { x: MARGIN_X + 424, width: 91 },
}

function tableBounds() {
  const left = COLS.item.x
  const right = COLS.notes.x + COLS.notes.width
  return { left, right, width: right - left, center: left + (right - left) / 2 }
}

function drawSectionTitle(ctx: PdfContext, name: string) {
  const size = 11
  const gapAbove = 12
  const gapBelow = 6
  ensureSpace(ctx, gapAbove + size + gapBelow + 20)
  ctx.y -= gapAbove + size

  const textWidth = ctx.bold.widthOfTextAtSize(name, size)
  ctx.page.drawText(name, {
    x: tableBounds().center - textWidth / 2,
    y: ctx.y,
    size,
    font: ctx.bold,
    color: INK,
  })
  ctx.y -= gapBelow
}

function drawCell(
  ctx: PdfContext,
  col: { x: number; width: number },
  y: number,
  height: number,
  text: string,
  font: PDFFont,
  size: number,
  align: 'left' | 'center',
) {
  ctx.page.drawRectangle({
    x: col.x,
    y: y - height,
    width: col.width,
    height,
    borderColor: INK,
    borderWidth: 0.7,
  })

  const lines = wrapText(text, font, size, col.width - 8)
  const lineHeight = size + 2
  const block = lines.length * lineHeight
  let textY = y - (height - block) / 2 - size + 1

  for (const line of lines) {
    const textWidth = font.widthOfTextAtSize(line, size)
    const x = align === 'center' ? col.x + (col.width - textWidth) / 2 : col.x + 4
    ctx.page.drawText(line, { x, y: textY, size, font, color: INK })
    textY -= lineHeight
  }
}

function rowHeight(item: Item, font: PDFFont, size: number) {
  const itemLines = wrapText(item.item, font, size, COLS.item.width - 8).length
  const noteLines = wrapText(item.notes, font, size, COLS.notes.width - 8).length
  return Math.max(14, Math.max(itemLines, noteLines) * (size + 1) + 5)
}

function drawTableHeader(ctx: PdfContext) {
  const height = 16
  ensureSpace(ctx, height + 4)
  const headers: Array<[keyof typeof COLS, string]> = [
    ['item', 'ITEM'],
    ['inQty', 'IN'],
    ['used', 'Used'],
    ['outQty', 'OUT'],
    ['notes', 'NOTES'],
  ]
  for (const [key, label] of headers) {
    drawCell(ctx, COLS[key], ctx.y, height, label, ctx.bold, 8, 'center')
  }
  ctx.y -= height
}

function drawSection(ctx: PdfContext, name: string, items: Item[]) {
  drawSectionTitle(ctx, name)
  drawTableHeader(ctx)

  for (const item of items) {
    const height = rowHeight(item, ctx.font, 8)
    ensureSpace(ctx, height + 2)
    if (ctx.y === A4_HEIGHT - MARGIN_TOP) {
      drawTableHeader(ctx)
    }
    drawCell(ctx, COLS.item, ctx.y, height, item.item, ctx.font, 8, 'left')
    drawCell(ctx, COLS.inQty, ctx.y, height, item.inQty, ctx.font, 8, 'center')
    drawCell(ctx, COLS.used, ctx.y, height, item.used, ctx.font, 8, 'center')
    drawCell(ctx, COLS.outQty, ctx.y, height, item.outQty, ctx.font, 8, 'center')
    drawCell(ctx, COLS.notes, ctx.y, height, item.notes, ctx.font, 8, 'left')
    ctx.y -= height
  }
}

function drawCenteredAt(
  page: PDFPage,
  text: string,
  centerX: number,
  y: number,
  font: PDFFont,
  size: number,
) {
  const width = font.widthOfTextAtSize(text, size)
  page.drawText(text, {
    x: centerX - width / 2,
    y,
    size,
    font,
    color: INK,
  })
  return width
}

function drawSignatures(ctx: PdfContext, letter: Endorsement) {
  const gap = 16
  const block = 48
  ensureSpace(ctx, gap + block)
  ctx.y -= gap

  const bounds = tableBounds()
  const leftX = bounds.left + bounds.width * 0.25
  const rightX = bounds.left + bounds.width * 0.75

  drawCenteredAt(ctx.page, 'Prepared by:', leftX, ctx.y, ctx.font, 11)
  drawCenteredAt(ctx.page, 'Received by:', rightX, ctx.y, ctx.font, 11)
  ctx.y -= 22

  const prepWidth = drawCenteredAt(ctx.page, letter.preparedBy.name, leftX, ctx.y, ctx.bold, 11)
  const recvWidth = drawCenteredAt(ctx.page, letter.receivedBy.name, rightX, ctx.y, ctx.bold, 11)
  ctx.page.drawLine({
    start: { x: leftX - prepWidth / 2, y: ctx.y - 2 },
    end: { x: leftX + prepWidth / 2, y: ctx.y - 2 },
    thickness: 0.6,
    color: INK,
  })
  ctx.page.drawLine({
    start: { x: rightX - recvWidth / 2, y: ctx.y - 2 },
    end: { x: rightX + recvWidth / 2, y: ctx.y - 2 },
    thickness: 0.6,
    color: INK,
  })

  ctx.y -= 13
  drawCenteredAt(ctx.page, letter.preparedBy.position, leftX, ctx.y, ctx.font, 10)
  drawCenteredAt(ctx.page, letter.receivedBy.position, rightX, ctx.y, ctx.font, 10)
}

export async function renderLetterPdf(letter: Endorsement, logos: Logos): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([A4_WIDTH, A4_HEIGHT])
  const font = await pdf.embedFont(StandardFonts.TimesRoman)
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold)
  const lgu = await pdf.embedPng(logos.lgu)
  const mdrrmo = await pdf.embedPng(logos.mdrrmo)

  const ctx: PdfContext = { pdf, page, font, bold, lgu, mdrrmo, y: 0 }
  drawPageChrome(ctx)
  drawHeader(ctx)
  drawMeta(ctx, letter)
  for (const section of letter.sections) {
    drawSection(ctx, section.name, section.items)
  }
  drawSignatures(ctx, letter)

  pdf.setTitle(`${letter.title} — ${letter.team}`)
  pdf.setAuthor(LETTERHEAD.office)
  return pdf.save()
}

export function pdfFilename(letter: Endorsement): string {
  const slug = letter.team
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `endorsement-${slug || letter.id}.pdf`
}

export async function loadLogos(env: { ASSETS?: Fetcher }, origin: string): Promise<Logos> {
  const load = async (path: string) => {
    if (env.ASSETS) {
      const fromAssets = await env.ASSETS.fetch(new Request(new URL(path, origin)))
      if (fromAssets.ok) return fromAssets.arrayBuffer()
    }
    const fallback = await fetch(new URL(path, origin))
    if (!fallback.ok) {
      throw new Error(`Unable to load logo ${path}`)
    }
    return fallback.arrayBuffer()
  }

  return {
    lgu: await load('/lgu.png'),
    mdrrmo: await load('/mdrrmo.png'),
  }
}
