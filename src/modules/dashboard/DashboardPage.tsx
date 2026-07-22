import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { DashboardStats } from '@/types'
import { DataTable } from '@/components/DataTable'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Package, Users, ShoppingCart, DollarSign, AlertTriangle, Loader2 } from 'lucide-react'

interface RecentSaleRow {
  id: string
  invoiceNo: string
  customerName: string
  grandTotal: number
  createdAt: string
  cashierName: string
}

function toRecentSaleRows(stats: DashboardStats): RecentSaleRow[] {
  return stats.recentSales.map((sale) => ({
    id: sale.id,
    invoiceNo: sale.invoiceNo,
    customerName: sale.customer?.fullName || 'Walk-in',
    grandTotal: sale.grandTotal,
    createdAt: sale.createdAt,
    cashierName: sale.user?.fullName || 'N/A',
  }))
}

const recentSalesColumns = [
  { key: 'invoiceNo', header: 'Invoice #', className: 'font-medium text-blue-700' },
  { key: 'customerName', header: 'Customer' },
  {
    key: 'grandTotal',
    header: 'Amount',
    render: (row: RecentSaleRow) => formatCurrency(row.grandTotal),
  },
  {
    key: 'createdAt',
    header: 'Date',
    render: (row: RecentSaleRow) => formatDateTime(row.createdAt),
  },
  { key: 'cashierName', header: 'Cashier' },
]

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(() => {
    setLoading(true)
    setError(null)
    api.dashboard.stats()
      .then((data) => {
        setStats(data)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-20" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-32 mb-4" />
          <div className="h-40 bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-2" />
          <p className="text-red-700 font-medium">Failed to load dashboard</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
          <button
            onClick={fetchStats}
            className="mt-4 px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const cards = [
    {
      label: 'Total Products',
      value: stats.productCount.toLocaleString(),
      icon: Package,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Total Customers',
      value: stats.customerCount.toLocaleString(),
      icon: Users,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: "Today's Sales",
      value: stats.salesTodayCount.toLocaleString(),
      icon: ShoppingCart,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: "Today's Revenue",
      value: formatCurrency(stats.totalSalesToday),
      icon: DollarSign,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ]

  const recentSaleRows = toRecentSaleRows(stats)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex items-center gap-4"
          >
            <div className={`${card.bg} ${card.color} w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0`}>
              <card.icon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500 truncate">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 truncate">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h2 className="text-base font-semibold text-gray-800">
            Low Stock Alerts
            {stats.lowStockItems.length > 0 && (
              <span className="ml-2 text-xs font-normal bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                {stats.lowStockItems.length}
              </span>
            )}
          </h2>
        </div>
        {stats.lowStockItems.length === 0 ? (
          <div className="p-5 text-center text-sm text-gray-400">
            All products are adequately stocked
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="table-header">Product</th>
                  <th className="table-header">SKU</th>
                  <th className="table-header text-right">Current Stock</th>
                  <th className="table-header text-right">Alert Threshold</th>
                  <th className="table-header text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.lowStockItems.map((item) => (
                  <tr key={item.id}>
                    <td className="table-cell">
                      <span className="font-medium text-gray-900">{item.product.name}</span>
                      {item.name && (
                        <span className="text-gray-400 ml-1">({item.name})</span>
                      )}
                    </td>
                    <td className="table-cell text-gray-500 text-xs font-mono">{item.sku}</td>
                    <td className="table-cell text-right">
                      <span className={item.stockQuantity === 0 ? 'text-red-600 font-bold' : 'text-gray-700'}>
                        {item.stockQuantity}
                      </span>
                    </td>
                    <td className="table-cell text-right text-gray-500">{item.lowStockAlert}</td>
                    <td className="table-cell text-center">
                      {item.stockQuantity === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          Out of Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          Low
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Recent Sales</h2>
        <DataTable
          columns={recentSalesColumns}
          data={recentSaleRows.slice(0, 10)}
          emptyMessage="No sales recorded yet"
        />
      </div>
    </div>
  )
}
