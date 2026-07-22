interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (item: T) => void
  emptyMessage?: string
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

export function DataTable<T extends { id: string }>({
  columns, data, onRowClick, emptyMessage = 'No data found', loading, error, onRetry,
}: DataTableProps<T>) {
  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="text-red-600 text-sm mb-3">{error}</p>
        {onRetry && <button onClick={onRetry} className="btn-secondary btn-sm">Retry</button>}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="card p-10 text-center">
        <div className="animate-spin w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-gray-400 text-sm">{emptyMessage}</p>
      </div>
    )
  }

  const getValue = (item: Record<string, unknown>, key: string): string => {
    const val = item[key]
    if (val === null || val === undefined) return '-'
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val)
    return String(val ?? '')
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {columns.map(col => (
                <th key={col.key} className={`table-header ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((item) => (
              <tr
                key={item.id}
                onClick={() => onRowClick?.(item)}
                className={`${onRowClick ? 'cursor-pointer hover:bg-blue-50/50' : 'table-row'}`}
              >
                {columns.map(col => (
                  <td key={col.key} className="table-cell">
                    {col.render
                      ? col.render(item)
                      : getValue(item as Record<string, unknown>, col.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
