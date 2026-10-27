/**
 * Zero-dependency XLSX generator using SpreadsheetML (Office Open XML).
 * Produces a real .xlsx file that Excel opens with proper column widths,
 * bold headers, and no "####" truncation.
 *
 * Supports: strings, numbers, booleans, null/undefined (→ empty cell).
 * Does NOT require any npm package — pure Node.js / Edge-compatible.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type CellValue = string | number | boolean | null | undefined

export interface XlsxColumn {
  header: string   // displayed column heading
  key: string      // key into the row object
  width?: number   // approximate character width (default: auto from header)
}

// ── XML helpers ───────────────────────────────────────────────────────────────

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // Strip characters illegal in XML 1.0
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
}

// ── Shared strings table ─────────────────────────────────────────────────────
// Storing strings in a shared table keeps the file smaller and is required
// for some Excel features.

function buildSharedStrings(
  headers: string[],
  rows: Record<string, CellValue>[],
  columns: XlsxColumn[],
): { xml: string; index: Map<string, number> } {
  const index = new Map<string, number>()
  let count = 0

  const add = (s: string) => {
    if (!index.has(s)) index.set(s, count++)
  }

  for (const h of headers) add(h)
  for (const row of rows) {
    for (const col of columns) {
      const v = row[col.key]
      if (v !== null && v !== undefined && typeof v !== 'number' && typeof v !== 'boolean') {
        add(String(v))
      }
    }
  }

  const entries = Array.from(index.keys()).map(
    (s) => `<si><t xml:space="preserve">${escapeXml(s)}</t></si>`,
  )

  const xml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
    `count="${count}" uniqueCount="${count}">` +
    entries.join('') +
    `</sst>`

  return { xml, index }
}

// ── Styles ────────────────────────────────────────────────────────────────────
// xfId 0 = normal cell, xfId 1 = bold header

function buildStyles(): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<fonts count="2">` +
    `<font><sz val="11"/><name val="Calibri"/></font>` +           // 0 — normal
    `<font><b/><sz val="11"/><name val="Calibri"/></font>` +       // 1 — bold
    `</fonts>` +
    `<fills count="2">` +
    `<fill><patternFill patternType="none"/></fill>` +
    `<fill><patternFill patternType="gray125"/></fill>` +
    `</fills>` +
    `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="2">` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +     // 0 normal
    `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/>` +     // 1 bold header
    `</cellXfs>` +
    `</styleSheet>`
  )
}

// ── Sheet XML ─────────────────────────────────────────────────────────────────

function colLetter(n: number): string {
  // n is 0-based
  let s = ''
  n += 1
  while (n > 0) {
    const rem = (n - 1) % 26
    s = String.fromCharCode(65 + rem) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

function buildSheet(
  headers: string[],
  rows: Record<string, CellValue>[],
  columns: XlsxColumn[],
  sharedIndex: Map<string, number>,
): string {
  const numCols = columns.length
  const lastCol = colLetter(numCols - 1)
  const totalRows = rows.length + 1 // +1 for header

  // Column widths — use provided width or derive from header length
  const colDefs = columns
    .map((col, i) => {
      const w = col.width ?? Math.max(col.header.length + 4, 10)
      return `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1" bestFit="1"/>`
    })
    .join('')

  // Header row
  const headerCells = headers
    .map((h, ci) => {
      const ref = `${colLetter(ci)}1`
      const si = sharedIndex.get(h) ?? 0
      return `<c r="${ref}" t="s" s="1"><v>${si}</v></c>`  // s="1" = bold style
    })
    .join('')

  // Data rows
  const dataRows = rows
    .map((row, ri) => {
      const rowNum = ri + 2 // 1-based, header is row 1
      const cells = columns
        .map((col, ci) => {
          const ref = `${colLetter(ci)}${rowNum}`
          const v = row[col.key]
          if (v === null || v === undefined || v === '') {
            return `<c r="${ref}"/>`
          }
          if (typeof v === 'number') {
            return `<c r="${ref}"><v>${v}</v></c>`
          }
          // Everything else → shared string
          const str = String(v)
          const si = sharedIndex.get(str)
          if (si === undefined) return `<c r="${ref}"/>`
          return `<c r="${ref}" t="s"><v>${si}</v></c>`
        })
        .join('')
      return `<row r="${rowNum}">${cells}</row>`
    })
    .join('')

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<dimension ref="A1:${lastCol}${totalRows}"/>` +
    `<sheetViews><sheetView tabSelected="1" workbookViewId="0">` +
    `<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>` +
    `</sheetView></sheetViews>` +
    `<cols>${colDefs}</cols>` +
    `<sheetData>` +
    `<row r="1">${headerCells}</row>` +
    dataRows +
    `</sheetData>` +
    `<autoFilter ref="A1:${lastCol}1"/>` +
    `</worksheet>`
  )
}

// ── ZIP packer (no dependencies) ─────────────────────────────────────────────
// Minimal ZIP store (compression method 0) — sufficient for XLSX.

function crc32(buf: Uint8Array): number {
  const table = crc32Table()
  let crc = 0xffffffff
  for (const b of buf) crc = (crc >>> 8) ^ table[(crc ^ b) & 0xff]
  return (crc ^ 0xffffffff) >>> 0
}

let _crc32Table: Uint32Array | null = null
function crc32Table(): Uint32Array {
  if (_crc32Table) return _crc32Table
  _crc32Table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    _crc32Table[i] = c
  }
  return _crc32Table
}

interface ZipEntry {
  name: string
  data: Uint8Array
  crc: number
  offset: number
}

function str2u8(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

function u16le(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff]
}
function u32le(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]
}

function buildZip(files: { name: string; content: string }[]): Uint8Array {
  const entries: ZipEntry[] = []
  const parts: Uint8Array[] = []

  for (const file of files) {
    const data = str2u8(file.content)
    const crc  = crc32(data)
    const nameBytes = str2u8(file.name)
    const offset = parts.reduce((acc, p) => acc + p.length, 0)

    // Local file header
    const localHeader = new Uint8Array([
      0x50, 0x4b, 0x03, 0x04,      // signature
      0x14, 0x00,                  // version needed
      0x00, 0x00,                  // flags
      0x00, 0x00,                  // compression (store)
      0x00, 0x00, 0x00, 0x00,      // mod time + date
      ...u32le(crc),               // CRC-32
      ...u32le(data.length),       // compressed size
      ...u32le(data.length),       // uncompressed size
      ...u16le(nameBytes.length),  // filename length
      0x00, 0x00,                  // extra length
      ...nameBytes,
    ])
    parts.push(localHeader, data)
    entries.push({ name: file.name, data, crc, offset })
  }

  // Central directory
  const cdParts: Uint8Array[] = []
  for (const e of entries) {
    const nameBytes = str2u8(e.name)
    const cd = new Uint8Array([
      0x50, 0x4b, 0x01, 0x02,      // signature
      0x14, 0x00,                  // version made by
      0x14, 0x00,                  // version needed
      0x00, 0x00,                  // flags
      0x00, 0x00,                  // compression
      0x00, 0x00, 0x00, 0x00,      // mod time + date
      ...u32le(e.crc),
      ...u32le(e.data.length),
      ...u32le(e.data.length),
      ...u16le(nameBytes.length),
      0x00, 0x00,                  // extra length
      0x00, 0x00,                  // comment length
      0x00, 0x00,                  // disk number start
      0x00, 0x00,                  // internal attributes
      0x00, 0x00, 0x00, 0x00,      // external attributes
      ...u32le(e.offset),
      ...nameBytes,
    ])
    cdParts.push(cd)
  }

  const cdOffset = parts.reduce((acc, p) => acc + p.length, 0)
  const cdSize   = cdParts.reduce((acc, p) => acc + p.length, 0)

  // End of central directory
  const eocd = new Uint8Array([
    0x50, 0x4b, 0x05, 0x06,
    0x00, 0x00,
    0x00, 0x00,
    ...u16le(entries.length),
    ...u16le(entries.length),
    ...u32le(cdSize),
    ...u32le(cdOffset),
    0x00, 0x00,
  ])

  // Concatenate all parts
  const allParts = [...parts, ...cdParts, eocd]
  const totalLen = allParts.reduce((acc, p) => acc + p.length, 0)
  const result = new Uint8Array(totalLen)
  let pos = 0
  for (const p of allParts) { result.set(p, pos); pos += p.length }
  return result
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a valid .xlsx binary from rows + column definitions.
 * Returns a Uint8Array that can be sent as an HTTP response.
 */
export function generateXlsx(
  rows: Record<string, CellValue>[],
  columns: XlsxColumn[],
  sheetName = 'Data',
): Uint8Array {
  const headers = columns.map((c) => c.header)

  const { xml: sharedStringsXml, index: sharedIndex } = buildSharedStrings(headers, rows, columns)
  const sheetXml    = buildSheet(headers, rows, columns, sharedIndex)
  const stylesXml   = buildStyles()

  const files = [
    {
      name: '[Content_Types].xml',
      content:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml"  ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml"               ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet1.xml"      ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
        `<Override PartName="/xl/sharedStrings.xml"          ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>` +
        `<Override PartName="/xl/styles.xml"                 ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
        `</Types>`,
    },
    {
      name: '_rels/.rels',
      content:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
        `</Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      content:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
        `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
        `<sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>` +
        `</workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"     Target="worksheets/sheet1.xml"/>` +
        `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>` +
        `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"        Target="styles.xml"/>` +
        `</Relationships>`,
    },
    { name: 'xl/worksheets/sheet1.xml', content: sheetXml },
    { name: 'xl/sharedStrings.xml',     content: sharedStringsXml },
    { name: 'xl/styles.xml',            content: stylesXml },
  ]

  return buildZip(files)
}
