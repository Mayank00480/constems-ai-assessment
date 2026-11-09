export const ALL = '__all__'

// A filter is { id, column, value }. Empty value = ignored. Case-insensitive "contains".
export function applyFilters(rows, filters) {
  const active = filters
    .map((f) => ({ column: f.column, value: f.value.trim().toLowerCase() }))
    .filter((f) => f.value !== '')
  if (!active.length) return rows
  return rows.filter((row) =>
    active.every((f) =>
      f.column === ALL
        ? Object.values(row).some((v) => String(v).toLowerCase().includes(f.value))
        : String(row[f.column] ?? '').toLowerCase().includes(f.value),
    ),
  )
}
