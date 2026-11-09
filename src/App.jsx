import { useMemo, useRef, useState } from 'react'
import { parseCSV, isNumericColumn, toNumber } from './csv.js'
import { ALL, applyFilters } from './filters.js'
import './App.css'

const PAGE_SIZE = 50
let nextId = 1

export default function App() {
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState([])
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [filters, setFilters] = useState([])
  const [sort, setSort] = useState(null)
  const [page, setPage] = useState(0)
  const inputRef = useRef(null)

  function loadFile(file) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError(`"${file.name}" is not a CSV file. Please upload a .csv file.`)
      return
    }
    setError('')
    const reader = new FileReader()
    reader.onerror = () => setError('Could not read file.')
    reader.onload = () => {
      const parsed = parseCSV(String(reader.result))
      if (!parsed.headers.length) return setError('No data found in file.')
      setFileName(file.name)
      setHeaders(parsed.headers)
      setRows(parsed.rows)
      setFilters([{ id: nextId++, column: ALL, value: '' }])
      setSort(null)
      setPage(0)
    }
    reader.readAsText(file)
  }

  const numericCols = useMemo(
    () => new Set(headers.filter((h) => isNumericColumn(rows, h))),
    [headers, rows],
  )

  const result = useMemo(() => {
    const out = applyFilters(rows, filters)
    if (!sort) return out
    const { col, dir } = sort
    const num = numericCols.has(col)
    const sorted = [...out].sort((a, b) =>
      num
        ? (toNumber(a[col]) || 0) - (toNumber(b[col]) || 0)
        : String(a[col]).localeCompare(String(b[col]), undefined, { numeric: true }),
    )
    return dir === 'desc' ? sorted.reverse() : sorted
  }, [rows, filters, sort, numericCols])

  const pages = Math.max(1, Math.ceil(result.length / PAGE_SIZE))
  const cur = Math.min(page, pages - 1)
  const visible = result.slice(cur * PAGE_SIZE, (cur + 1) * PAGE_SIZE)

  const addFilter = () => setFilters((f) => [...f, { id: nextId++, column: ALL, value: '' }])
  const removeFilter = (id) =>
    setFilters((f) => (f.length > 1 ? f.filter((x) => x.id !== id) : [{ ...f[0], value: '' }]))
  const updateFilter = (id, patch) => {
    setFilters((f) => f.map((x) => (x.id === id ? { ...x, ...patch } : x)))
    setPage(0)
  }
  const clearAll = () => {
    setFilters([{ id: nextId++, column: ALL, value: '' }])
    setPage(0)
  }
  const toggleSort = (col) =>
    setSort((s) =>
      !s || s.col !== col ? { col, dir: 'asc' } : s.dir === 'asc' ? { col, dir: 'desc' } : null,
    )

  const hasFilter = filters.some((f) => f.value.trim())

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>CSV Viewer</h1>
          <p className="sub">Upload a CSV, then filter it by any column.</p>
        </div>
        {rows.length > 0 && (
          <button className="btn" onClick={() => inputRef.current.click()}>
            Upload another file
          </button>
        )}
      </header>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(e) => {
          loadFile(e.target.files[0])
          e.target.value = ''
        }}
      />

      {error && <p className="error">{error}</p>}

      {!rows.length ? (
        <div
          className={`drop ${dragging ? 'drag' : ''}`}
          onClick={() => inputRef.current.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            loadFile(e.dataTransfer.files[0])
          }}
        >
          <div className="drop-icon">⬆</div>
          <strong>Drop your CSV here</strong>
          <span>or click to choose a file</span>
        </div>
      ) : (
        <>
          <section className="card">
            <div className="card-head">
              <strong>Filters</strong>
              <div className="row">
                {hasFilter && (
                  <button className="link" onClick={clearAll}>
                    Clear all
                  </button>
                )}
                <button className="btn primary" onClick={addFilter}>
                  + Add filter
                </button>
              </div>
            </div>

            {filters.map((f) => (
              <div className="filter" key={f.id}>
                <select value={f.column} onChange={(e) => updateFilter(f.id, { column: e.target.value })}>
                  <option value={ALL}>All columns</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <span className="op">contains</span>
                <input
                  type="text"
                  placeholder="Type to filter…"
                  value={f.value}
                  onChange={(e) => updateFilter(f.id, { value: e.target.value })}
                />
                <button className="x" title="Remove filter" onClick={() => removeFilter(f.id)}>
                  ✕
                </button>
              </div>
            ))}
          </section>

          <div className="meta">
            <span>
              <b>{result.length.toLocaleString()}</b> of {rows.length.toLocaleString()} rows
              {fileName && <> · {fileName}</>}
            </span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {headers.map((h) => (
                    <th key={h} onClick={() => toggleSort(h)} className={numericCols.has(h) ? 'num' : ''}>
                      {h}
                      {sort?.col === h && (sort.dir === 'asc' ? ' ▲' : ' ▼')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => (
                  <tr key={cur * PAGE_SIZE + i}>
                    {headers.map((h) => (
                      <td key={h} className={numericCols.has(h) ? 'num' : ''}>
                        {r[h]}
                      </td>
                    ))}
                  </tr>
                ))}
                {!visible.length && (
                  <tr>
                    <td className="empty" colSpan={headers.length}>
                      No rows match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="pager">
              <button className="btn" disabled={cur === 0} onClick={() => setPage(cur - 1)}>
                ← Prev
              </button>
              <span>
                Page {cur + 1} of {pages}
              </span>
              <button className="btn" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
