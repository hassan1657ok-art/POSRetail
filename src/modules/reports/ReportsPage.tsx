import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { useToastStore } from '@/stores/toast.store'
import { DataTable } from '@/components/DataTable'
import { formatCurrency } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, Receipt, Percent, ShoppingCart,
  CreditCard, Banknote, Wallet, Loader2,
} from 'lucide-react'

interface SalesSummaryData {
  totalSales: number
  totalRevenue: number
  totalDiscounts: number
  totalTax: number
  paymentMethods: { method: string; count: number; total: number }[]
}

interface ProfitLossData {
  totalRevenue: number
  totalCost: number
  grossProfit: number
  marginPercent: number
}

interface TopProductRow {
  id: string
  productName: string
  sku: string
  quantitySold: number
  revenue: number
}

interface CashierRow {
  id: string
  cashierName: string
  saleCount: number
  totalAmount: number
}

type ReportTab = 'sales' | 'profit' | 'products' | 'cashiers'

const TABS: { key: ReportTab; label: string }[] = [
  { key: 'sales', label: 'Sales Summary' },
  { key: 'profit', label: 'Profit & Loss' },
  { key: 'products', label: 'Top Products' },
  { key: 'cashiers', label: 'Cashier Summary' },
]

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function asNumber(val: unknown, fallback: number = 0): number {
  if (typeof val === 'number' && Number.isFinite(val)) return val
  const n = Number(val)
  return Number.isFinite(n) ? n : fallback
}

function asString(val: unknown, fallback: string = ''): string {
  if (typeof val === 'string') return val
  if (val === null || val === undefined) return fallback
  return String(val)
}

function paymentIcon(method: string) {
  const m = method.toLowerCase()
  if (m.includes('cash')) return <Banknote className="w-4 h-4 text-emerald-500" />
  if (m.includes('card') || m.includes('credit') || m.includes('debit')) return <CreditCard className="w-4 h-4 text-blue-500" />
  if (m.includes('wallet') || m.includes('digital') || m.includes('online')) return <Wallet className="w-4 h-4 text-purple-500" />
  return <DollarSign className="w-4 h-4 text-gray-400" />
}

function parseSalesSummary(raw: Record<string, unknown>): SalesSummaryData {
  const paymentMethods: { method: string; count: number; total: number }[] = []
  if (Array.isArray(raw.paymentMethods)) {
    for (const pm of raw.paymentMethods as Record<string, unknown>[]) {
      paymentMethods.push({
        method: asString(pm.method, 'Unknown'),
        count: asNumber(pm.count, 0),
        total: asNumber(pm.total, 0),
      })
    }
  }
  return {
    totalSales: asNumber(raw.totalSales, 0),
    totalRevenue: asNumber(raw.totalRevenue, 0),
    totalDiscounts: asNumber(raw.totalDiscounts, 0),
    totalTax: asNumber(raw.totalTax, 0),
    paymentMethods,
  }
}

function parseProfitLoss(raw: Record<string, unknown>): ProfitLossData {
  const totalRevenue = asNumber(raw.totalRevenue, 0)
  const totalCost = asNumber(raw.totalCost, 0)
  const grossProfit = totalRevenue - totalCost
  const marginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
  return {
    totalRevenue: asNumber(raw.totalRevenue, 0),
    totalCost: asNumber(raw.totalCost, 0),
    grossProfit: asNumber(raw.grossProfit, grossProfit),
    marginPercent: asNumber(raw.marginPercent, marginPercent),
  }
}

function parseTopProducts(raw: Record<string, unknown>[]): TopProductRow[] {
  return raw.map((item, i) => ({
    id: asString(item.sku, `top-${i}`),
    productName: asString(item.productName, 'Unknown'),
    sku: asString(item.sku, ''),
    quantitySold: asNumber(item.quantitySold, 0),
    revenue: asNumber(item.revenue, 0),
  }))
}

function parseCashierSummary(raw: Record<string, unknown>[]): CashierRow[] {
  return raw.map((item, i) => ({
    id: String(i),
    cashierName: asString(item.cashierName || item.userName, 'Unknown'),
    saleCount: asNumber(item.saleCount, 0),
    totalAmount: asNumber(item.totalAmount || item.total, 0),
  }))
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('sales')
  const [startDate, setStartDate] = useState(todayStr())
  const [endDate, setEndDate] = useState(todayStr())
  const [applyLoading, setApplyLoading] = useState(false)
  const addToast = useToastStore((s) => s.addToast)

  const [salesData, setSalesData] = useState<SalesSummaryData | null>(null)
  const [salesLoading, setSalesLoading] = useState(false)
  const [salesError, setSalesError] = useState<string | null>(null)

  const [profitData, setProfitData] = useState<ProfitLossData | null>(null)
  const [profitLoading, setProfitLoading] = useState(false)
  const [profitError, setProfitError] = useState<string | null>(null)

  const [topProducts, setTopProducts] = useState<TopProductRow[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productsError, setProductsError] = useState<string | null>(null)

  const [cashiers, setCashiers] = useState<CashierRow[]>([])
  const [cashiersLoading, setCashiersLoading] = useState(false)
  const [cashiersError, setCashiersError] = useState<string | null>(null)

  const fetchSalesSummary = useCallback(() => {
    setSalesLoading(true)
    setSalesError(null)
    api.reports.salesSummary(startDate, endDate)
      .then((data) => {
        setSalesData(parseSalesSummary(data))
        setSalesLoading(false)
      })
      .catch((err: unknown) => {
        setSalesError(err instanceof Error ? err.message : 'Failed to load sales summary')
        setSalesLoading(false)
      })
  }, [startDate, endDate])

  const fetchProfitLoss = useCallback(() => {
    setProfitLoading(true)
    setProfitError(null)
    api.reports.profitLoss(startDate, endDate)
      .then((data) => {
        setProfitData(parseProfitLoss(data))
        setProfitLoading(false)
      })
      .catch((err: unknown) => {
        setProfitError(err instanceof Error ? err.message : 'Failed to load profit & loss')
        setProfitLoading(false)
      })
  }, [startDate, endDate])

  const fetchTopProducts = useCallback(() => {
    setProductsLoading(true)
    setProductsError(null)
    api.reports.topProducts(startDate, endDate, 10)
      .then((data) => {
        setTopProducts(parseTopProducts(data))
        setProductsLoading(false)
      })
      .catch((err: unknown) => {
        setProductsError(err instanceof Error ? err.message : 'Failed to load top products')
        setProductsLoading(false)
      })
  }, [startDate, endDate])

  const fetchCashierSummary = useCallback(() => {
    setCashiersLoading(true)
    setCashiersError(null)
    api.reports.cashierSummary(startDate, endDate)
      .then((data) => {
        setCashiers(parseCashierSummary(data))
        setCashiersLoading(false)
      })
      .catch((err: unknown) => {
        setCashiersError(err instanceof Error ? err.message : 'Failed to load cashier summary')
        setCashiersLoading(false)
      })
  }, [startDate, endDate])

  const clearAllData = useCallback(() => {
    setSalesData(null)
    setSalesError(null)
    setProfitData(null)
    setProfitError(null)
    setTopProducts([])
    setProductsError(null)
    setCashiers([])
    setCashiersError(null)
  }, [])

  useEffect(() => {
    if (salesData === null && salesError === null) fetchSalesSummary()
    if (profitData === null && profitError === null) fetchProfitLoss()
    if (topProducts.length === 0 && productsError === null) fetchTopProducts()
    if (cashiers.length === 0 && cashiersError === null) fetchCashierSummary()
  }, [activeTab])

  const handleApplyDates = useCallback(() => {
    clearAllData()
    setApplyLoading(true)

    const fetchers = [
      fetchSalesSummary(),
      fetchProfitLoss(),
      fetchTopProducts(),
      fetchCashierSummary(),
    ]

    Promise.allSettled(fetchers).then((results) => {
      setApplyLoading(false)
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed > 0) {
        addToast({
          type: 'error',
          title: `${failed} report(s) failed`,
          message: 'Some reports could not be loaded. Switch tabs for retry details.',
        })
      }
    })
  }, [clearAllData, fetchSalesSummary, fetchProfitLoss, fetchTopProducts, fetchCashierSummary, addToast])

  const topProductsColumns = [
    { key: 'productName', header: 'Product', className: 'font-medium' },
    { key: 'sku', header: 'SKU' },
    {
      key: 'quantitySold',
      header: 'Qty Sold',
      className: 'text-right',
      render: (row: TopProductRow) => row.quantitySold.toLocaleString(),
    },
    {
      key: 'revenue',
      header: 'Revenue',
      className: 'text-right',
      render: (row: TopProductRow) => formatCurrency(row.revenue),
    },
  ]

  const cashierColumns = [
    { key: 'cashierName', header: 'Cashier', className: 'font-medium' },
    {
      key: 'saleCount',
      header: 'Sales',
      className: 'text-right',
      render: (row: CashierRow) => row.saleCount.toLocaleString(),
    },
    {
      key: 'totalAmount',
      header: 'Total',
      className: 'text-right',
      render: (row: CashierRow) => formatCurrency(row.totalAmount),
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Reports</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleApplyDates}
            disabled={applyLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {applyLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Apply
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'sales' && (
        <SalesSummaryTab
          data={salesData}
          loading={salesLoading}
          error={salesError}
          onRetry={fetchSalesSummary}
        />
      )}

      {activeTab === 'profit' && (
        <ProfitLossTab
          data={profitData}
          loading={profitLoading}
          error={profitError}
          onRetry={fetchProfitLoss}
        />
      )}

      {activeTab === 'products' && (
        <TopProductsTab
          data={topProducts}
          loading={productsLoading}
          error={productsError}
          onRetry={fetchTopProducts}
          columns={topProductsColumns}
        />
      )}

      {activeTab === 'cashiers' && (
        <CashiersTab
          data={cashiers}
          loading={cashiersLoading}
          error={cashiersError}
          onRetry={fetchCashierSummary}
          columns={cashierColumns}
        />
      )}
    </div>
  )
}

function SalesSummaryTab({
  data, loading, error, onRetry,
}: {
  data: SalesSummaryData | null
  loading: boolean
  error: string | null
  onRetry: () => void
}) {
  if (loading) return <LoadingBlock />
  if (error) return <ErrorBlock message={error} onRetry={onRetry} />
  if (!data) return <EmptyBlock message="Select a date range and click Apply" />

  const summaryCards = [
    { label: 'Total Sales', value: data.totalSales.toLocaleString(), icon: Receipt, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Revenue', value: formatCurrency(data.totalRevenue), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Discounts', value: formatCurrency(data.totalDiscounts), icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Total Tax', value: formatCurrency(data.totalTax), icon: Percent, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex items-center gap-4">
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
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">Payment Methods</h2>
        </div>
        {data.paymentMethods && data.paymentMethods.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="table-header">Method</th>
                  <th className="table-header text-right">Count</th>
                  <th className="table-header text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.paymentMethods.map((pm, i) => (
                  <tr key={i}>
                    <td className="table-cell">
                      <span className="flex items-center gap-2">
                        {paymentIcon(pm.method)}
                        <span className="font-medium capitalize">{pm.method}</span>
                      </span>
                    </td>
                    <td className="table-cell text-right">{pm.count.toLocaleString()}</td>
                    <td className="table-cell text-right font-medium">{formatCurrency(pm.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5 text-center text-sm text-gray-400">No payment data</div>
        )}
      </div>
    </div>
  )
}

function ProfitLossTab({
  data, loading, error, onRetry,
}: {
  data: ProfitLossData | null
  loading: boolean
  error: string | null
  onRetry: () => void
}) {
  if (loading) return <LoadingBlock />
  if (error) return <ErrorBlock message={error} onRetry={onRetry} />
  if (!data) return <EmptyBlock message="Select a date range and click Apply" />

  const marginColor = data.marginPercent >= 0 ? 'text-emerald-600' : 'text-red-600'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <p className="text-sm text-gray-500">Total Revenue</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(data.totalRevenue)}</p>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <p className="text-sm text-gray-500">Total Cost</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(data.totalCost)}</p>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <p className="text-sm text-gray-500">Gross Profit</p>
        <p className={`text-2xl font-bold mt-1 ${data.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {formatCurrency(data.grossProfit)}
        </p>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <p className="text-sm text-gray-500">Margin</p>
        <div className="flex items-center gap-2 mt-1">
          <p className={`text-2xl font-bold ${marginColor}`}>
            {data.marginPercent.toFixed(1)}%
          </p>
          {data.marginPercent >= 0 ? (
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          ) : (
            <TrendingDown className="w-5 h-5 text-red-500" />
          )}
        </div>
      </div>
    </div>
  )
}

function TopProductsTab({
  data, loading, error, onRetry, columns,
}: {
  data: TopProductRow[]
  loading: boolean
  error: string | null
  onRetry: () => void
  columns: { key: string; header: string; className?: string; render?: (row: TopProductRow) => React.ReactNode }[]
}) {
  if (loading) return <LoadingBlock />
  if (error) return <ErrorBlock message={error} onRetry={onRetry} />

  return (
    <div className="space-y-6">
      {data.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Units Sold by Product</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="productName"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '13px',
                }}
                formatter={(value: number) => [value.toLocaleString(), 'Units Sold']}
              />
              <Bar dataKey="quantitySold" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage="Select a date range and click Apply"
      />
    </div>
  )
}

function CashiersTab({
  data, loading, error, onRetry, columns,
}: {
  data: CashierRow[]
  loading: boolean
  error: string | null
  onRetry: () => void
  columns: { key: string; header: string; className?: string; render?: (row: CashierRow) => React.ReactNode }[]
}) {
  if (loading) return <LoadingBlock />
  if (error) return <ErrorBlock message={error} onRetry={onRetry} />

  return (
    <DataTable
      columns={columns}
      data={data}
      loading={loading}
      emptyMessage="Select a date range and click Apply"
    />
  )
}

function LoadingBlock() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
            <div className="h-8 bg-gray-200 rounded w-28" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-32 mb-4" />
        <div className="h-32 bg-gray-100 rounded" />
      </div>
    </div>
  )
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <p className="text-red-700 font-medium">Failed to load data</p>
      <p className="text-red-500 text-sm mt-1">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
      >
        Retry
      </button>
    </div>
  )
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-10 text-center">
      <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-2" />
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  )
}
