import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import { useToastStore } from '@/stores/toast.store'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types'
import { Search, Plus, Pencil, Trash2, Package } from 'lucide-react'
import { Modal } from '@/components/Modal'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ProductForm } from './ProductForm'

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return 'An unexpected error occurred'
}

function StockBadge({ variant }: { variant: Product['variants'][number] }) {
  const stock = variant.stockQuantity
  const alert = variant.lowStockAlert
  if (stock <= 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Out of stock
      </span>
    )
  }
  if (stock <= alert) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Low: {stock}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
      {stock} in stock
    </span>
  )
}

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const addToast = useToastStore((s) => s.addToast)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = debouncedQuery.trim()
        ? await api.products.search(debouncedQuery.trim())
        : await api.products.getAll()
      setProducts(result)
    } catch (err) {
      setError(extractErrorMessage(err))
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleAdd = () => {
    setEditingProduct(null)
    setModalOpen(true)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setModalOpen(true)
  }

  const handleSave = () => {
    setModalOpen(false)
    setEditingProduct(null)
    fetchProducts()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    try {
      await api.products.delete(deleteTarget.id)
      addToast({ type: 'success', title: 'Product deleted', message: `"${deleteTarget.name}" has been removed.` })
      setDeleteTarget(null)
      fetchProducts()
    } catch (err) {
      addToast({ type: 'error', title: 'Delete failed', message: extractErrorMessage(err) })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="input pl-9 w-64"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={handleAdd} className="btn-primary flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button className="ml-2 underline text-red-800 hover:text-red-900" onClick={fetchProducts}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Package className="w-16 h-16 mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">
            {debouncedQuery.trim()
              ? 'No products match your search'
              : 'No products yet'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {debouncedQuery.trim()
              ? 'Try adjusting your search terms.'
              : 'Click "Add Product" to create your first product.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {products.map((product) => {
            const firstVariant = product.variants?.[0]
            const variantCount = product.variants?.length ?? 0
            const totalStock = product.variants?.reduce((s, v) => s + v.stockQuantity, 0) ?? 0
            const totalAlert = product.variants?.reduce((s, v) => s + v.lowStockAlert, 0) ?? 0
            const isDeleting = deletingId === product.id

            return (
              <div
                key={product.id}
                className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 truncate">{product.name}</h3>
                    {product.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{product.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <button
                      onClick={() => handleEdit(product)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(product)}
                      disabled={isDeleting}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Delete"
                    >
                      {isDeleting ? (
                        <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {product.category && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {product.category.name}
                    </span>
                  )}
                  {product.brand && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      {product.brand.name}
                    </span>
                  )}
                  {variantCount > 1 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      {variantCount} variants
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-xs text-gray-400">SKU</span>
                    <p className="text-sm font-mono text-gray-700">{firstVariant?.sku ?? '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Price</span>
                    <p className="text-sm font-medium text-gray-900">
                      {firstVariant ? formatCurrency(firstVariant.sellingPrice) : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Stock</span>
                    <div className="mt-0.5">
                      <StockBadge variant={{ stockQuantity: totalStock, lowStockAlert: totalAlert } as Product['variants'][number]} />
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Supplier</span>
                    <p className="text-sm text-gray-700 truncate">{product.supplier?.name ?? '—'}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingProduct(null) }}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        size="lg"
      >
        <ProductForm
          product={editingProduct}
          onSave={handleSave}
          onCancel={() => { setModalOpen(false); setEditingProduct(null) }}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel={deletingId ? 'Deleting...' : 'Delete'}
        danger
      />
    </div>
  )
}
