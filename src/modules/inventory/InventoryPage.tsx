import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useToastStore } from '@/stores/toast.store'
import type { InventoryMovement, ProductVariant, Product } from '@/types'
import { DataTable } from '@/components/DataTable'
import { Modal } from '@/components/Modal'
import { formatDateTime } from '@/lib/utils'
import { Plus, AlertTriangle, Loader2 } from 'lucide-react'

export function InventoryPage() {
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [lowStock, setLowStock] = useState<ProductVariant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [form, setForm] = useState({ variantId: '', quantity: '', reason: '' })
  const [saving, setSaving] = useState(false)
  const addToast = useToastStore(s => s.addToast)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const [m, low] = await Promise.all([api.inventory.getMovements(), api.inventory.getLowStock()])
      setMovements(m)
      setLowStock(low)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to load') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openAdjust = async () => {
    try {
      const products = await api.products.getAll()
      const allVariants = products.flatMap(p =>
        p.variants.filter(v => v.isActive).map(v => ({ ...v, productName: p.name }))
      )
      setVariants(allVariants as unknown as ProductVariant[])
      setForm({ variantId: allVariants[0]?.id || '', quantity: '', reason: '' })
      setModalOpen(true)
    } catch {
      addToast({ type: 'error', title: 'Failed to load product variants' })
    }
  }

  const handleAdjust = async () => {
    const qty = parseFloat(form.quantity)
    if (!form.variantId || isNaN(qty) || qty === 0 || !form.reason.trim()) return
    setSaving(true)
    try {
      await api.inventory.adjust({ variantId: form.variantId, quantity: qty, reason: form.reason.trim() })
      addToast({ type: 'success', title: 'Stock adjusted successfully' })
      setModalOpen(false); load()
    } catch (e: unknown) {
      addToast({ type: 'error', title: e instanceof Error ? e.message : 'Adjustment failed' })
    } finally { setSaving(false) }
  }

  const selectedVariant = variants.find(v => v.id === form.variantId)

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-gray-800">Inventory</h2>
        <button onClick={openAdjust} className="btn-primary btn-sm"><Plus className="w-4 h-4" /> Adjust Stock</button>
      </div>

      {lowStock.length > 0 && (
        <div className="card p-4 mb-5 bg-amber-50 border-amber-200 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-2 text-amber-800 font-medium mb-3">
            <AlertTriangle className="w-5 h-5" />
            <span>Low Stock Alerts ({lowStock.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {lowStock.slice(0, 12).map(item => {
              const v = item as unknown as { productName?: string; sku: string; stockQuantity: number; lowStockAlert: number }
              return (
                <div key={item.id} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-amber-200 text-sm">
                  <div className="truncate mr-2">
                    <span className="font-medium">{v.productName || 'Unknown'}</span>
                    <span className="text-gray-400 ml-1">{v.sku}</span>
                  </div>
                  <span className={`badge flex-shrink-0 ${v.stockQuantity <= 0 ? 'badge-red' : 'badge-yellow'}`}>
                    {v.stockQuantity} / {v.lowStockAlert}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <DataTable
        loading={loading} error={error} onRetry={load}
        columns={[
          { key: 'createdAt', header: 'Date', render: (m: InventoryMovement) => formatDateTime(m.createdAt) },
          {
            key: 'type', header: 'Type',
            render: (m: InventoryMovement) =>
              m.type === 'stock_in' ? <span className="badge-green">IN</span> :
              m.type === 'sale' ? <span className="badge-blue">Sale</span> :
              <span className="badge-red">OUT</span>,
          },
          { key: 'variant', header: 'Product/SKU', render: (m: InventoryMovement) => m.variant ? `${(m.variant as unknown as { product?: { name: string } }).product?.name || 'Unknown'} - ${m.variant.sku}` : '-' },
          { key: 'quantity', header: 'Qty', render: (m: InventoryMovement) => <span className={`font-medium ${m.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{m.quantity > 0 ? '+' : ''}{m.quantity}</span> },
          { key: 'previousQty', header: 'Before' },
          { key: 'newQty', header: 'After', render: (m: InventoryMovement) => <span className="font-medium">{m.newQty}</span> },
          { key: 'reason', header: 'Reason' },
          { key: 'user', header: 'User', render: (m: InventoryMovement) => m.user?.fullName || '-' },
        ]}
        data={movements.slice(0, 200)}
        emptyMessage="No inventory movements recorded yet"
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Adjust Stock" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Product Variant</label>
            <select className="input" value={form.variantId} onChange={e => setForm({ ...form, variantId: e.target.value })}>
              {variants.map(v => (
                <option key={v.id} value={v.id}>
                  {(v as unknown as { productName?: string }).productName || 'Unknown'} - {v.sku} (Stock: {v.stockQuantity})
                </option>
              ))}
            </select>
          </div>
          {selectedVariant && (
            <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded">Current stock: <strong>{selectedVariant.stockQuantity}</strong></p>
          )}
          <div>
            <label className="label">Adjustment Quantity</label>
            <input type="number" className="input" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="e.g. 10 to add, -5 to remove" step="0.01" />
            <p className="text-xs text-gray-400 mt-1">Positive = stock in, Negative = stock out</p>
          </div>
          <div>
            <label className="label">Reason</label>
            <input className="input" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Stock count correction, damage, return" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary btn-sm" disabled={saving}>Cancel</button>
            <button onClick={handleAdjust} className="btn-primary btn-sm" disabled={saving || !form.variantId || !form.quantity || !form.reason.trim()}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : 'Adjust Stock'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
