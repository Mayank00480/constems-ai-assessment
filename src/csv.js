// RFC 4180-ish CSV parser: quoted fields, escaped quotes, embedded newlines/delimiters.
export function parseCSV(text, delimiter) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1) // strip BOM
  const delim = delimiter || detectDelimiter(text)
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += c
    } else if (c === '"') {
      inQuotes = true
    } else if (c === delim) {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }

  const nonEmpty = rows.filter((r) => r.some((v) => v.trim() !== ''))
  if (!nonEmpty.length) return { headers: [], rows: [] }

  const width = Math.max(...nonEmpty.map((r) => r.length))
  const seen = {}
  const headers = Array.from({ length: width }, (_, i) => {
    let h = (nonEmpty[0][i] ?? '').trim() || `Column ${i + 1}`
    if (seen[h]) h = `${h} (${++seen[h]})`
    else seen[h] = 1
    return h
  })
  const data = nonEmpty.slice(1).map((r) => {
    const out = {}
    headers.forEach((h, i) => (out[h] = r[i] ?? ''))
    return out
  })
  return { headers, rows: data }
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0]
  const counts = [',', ';', '\t', '|'].map((d) => [d, firstLine.split(d).length])
  counts.sort((a, b) => b[1] - a[1])
  return counts[0][1] > 1 ? counts[0][0] : ','
}

const NUM = /^-?\d+(\.\d+)?$/
export function toNumber(v) {
  const s = String(v).trim().replace(/,/g, '')
  return NUM.test(s) ? parseFloat(s) : NaN
}

// column is "numeric" if every non-empty value parses as a number
export function isNumericColumn(rows, col) {
  let seen = false
  for (const r of rows) {
    const v = r[col]
    if (String(v).trim() === '') continue
    if (Number.isNaN(toNumber(v))) return false
    seen = true
  }
  return seen
}
