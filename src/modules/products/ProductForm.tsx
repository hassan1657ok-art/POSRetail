import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { useToastStore } from '@/stores/toast.store'
import type { Product, Category, Brand, Supplier, ProductVariant } from '@/types'

interface Props {
  product?: Product | null
  onSave: () => void
  onCancel: () => void
}

interface VariantInput {
  id: string
  sku: string
  barcode: string
  name: string
  costPrice: string
  sellingPrice: string
  stockQuantity: string
  lowStockAlert: string
}

function variantToInput(v: ProductVariant): VariantInput {
  return {
    id: v.id,
    sku: v.sku,
    barcode: v.barcode ?? '',
    name: v.name,
    costPrice: v.costPrice.toString(),
    sellingPrice: v.sellingPrice.toString(),
    stockQuantity: v.stockQuantity.toString(),
    lowStockAlert: v.lowStockAlert.toString(),
  }
}

function emptyVariant(): VariantInput {
  return {
    id: '',
    sku: '',
    barcode: '',
    name: '',
    costPrice: '',
    sellingPrice: '',
    stockQuantity: '',
    lowStockAlert: '',
  }
}

interface FieldErrors {
  [key: string]: string
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return 'An unexpected error occurred'
}

export function ProductForm({ product, onSave, onCancel }: Props) {
  const isEdit = !!product

  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [brandId, setBrandId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [description, setDescription] = useState('')

  const [variants, setVariants] = useState<VariantInput[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  const [loadingOptions, setLoadingOptions] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadingOptions(true)
      try {
        const [cats, brds, sups] = await Promise.all([
          api.categories.getAll(),
          api.brands.getAll(),
          api.suppliers.getAll(),
        ])
        if (!cancelled) {
          setCategories(cats)
          setBrands(brds)
          setSuppliers(sups)
        }
      } catch (err) {
        if (!cancelled) setError(extractErrorMessage(err))
      } finally {
        if (!cancelled) setLoadingOptions(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (product) {
      setName(product.name)
      setCategoryId(product.categoryId ?? '')
      setBrandId(product.brandId ?? '')
      setSupplierId(product.supplierId ?? '')
      setDescription(product.description ?? '')
      setVariants(
        product.variants.length > 0
          ? product.variants.map(variantToInput)
          : [emptyVariant()]
      )
    } else {
      setName('')
      setCategoryId('')
      setBrandId('')
      setSupplierId('')
      setDescription('')
      setVariants([emptyVariant()])
    }
  }, [product])

  const updateVariant = useCallback((index: number, field: keyof VariantInput, value: string) => {
    setVariants(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
    setFieldErrors(prev => {
      const key = `variant_${index}_${field}`
      if (prev[key]) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return prev
    })
  }, [])

  const addVariant = () => {
    setVariants(prev => [...prev, emptyVariant()])
  }

  const removeVariant = (index: number) => {
    if (variants.length <= 1) return
    setVariants(prev => prev.filter((_, i) => i !== index))
    setFieldErrors(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(k => {
        if (k.startsWith(`variant_${index}_`)) delete next[k]
      })
      return next
    })
  }

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {}

    if (!name.trim()) errors.name = 'Product name is required'

    if (!categoryId) errors.categoryId = 'Category is required'

    variants.forEach((v, i) => {
      if (!v.sku.trim()) errors[`variant_${i}_sku`] = 'SKU is required'
      if (!v.name.trim()) errors[`variant_${i}_name`] = 'Variant name is required'
      if (!v.costPrice || isNaN(Number(v.costPrice)) || Number(v.costPrice) < 0)
        errors[`variant_${i}_costPrice`] = 'Must be a non-negative number'
      if (!v.sellingPrice || isNaN(Number(v.sellingPrice)) || Number(v.sellingPrice) < 0)
        errors[`variant_${i}_sellingPrice`] = 'Must be a non-negative number'
      if (v.stockQuantity === '' || isNaN(Number(v.stockQuantity)) || Number(v.stockQuantity) < 0)
        errors[`variant_${i}_stockQuantity`] = 'Must be a non-negative number'
      if (v.lowStockAlert === '' || isNaN(Number(v.lowStockAlert)) || Number(v.lowStockAlert) < 0)
        errors[`variant_${i}_lowStockAlert`] = 'Must be a non-negative number'
    })

    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setError('Please fix the highlighted fields before saving.')
      return
    }

    setError(null)
    setSubmitting(true)

    const payload = {
      name: name.trim(),
      categoryId,
      brandId: brandId || null,
      supplierId: supplierId || null,
      description: description.trim() || null,
      variants: variants.map(v => ({
        id: v.id || undefined,
        sku: v.sku.trim(),
        barcode: v.barcode.trim() || null,
        name: v.name.trim(),
        costPrice: Number(v.costPrice),
        sellingPrice: Number(v.sellingPrice),
        stockQuantity: Number(v.stockQuantity),
        lowStockAlert: Number(v.lowStockAlert),
      })),
    }

    try {
      if (isEdit) {
        await api.products.update(product.id, payload)
      } else {
        await api.products.create(payload)
      }
      addToast({
        type: 'success',
        title: isEdit ? 'Product updated' : 'Product created',
        message: `"${name.trim()}" has been ${isEdit ? 'updated' : 'created'} successfully.`,
      })
      onSave()
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = (fieldKey: string, base = 'input') =>
    `${base} ${fieldErrors[fieldKey] ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''}`

  if (loadingOptions) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
        <span className="ml-2 text-sm text-gray-500">Loading form...</span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Basic Info</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Product Name *</label>
            <input
              type="text"
              className={inputClass('name')}
              value={name}
              onChange={(e) => { setName(e.target.value); setFieldErrors(p => { const n = { ...p }; delete n.name; return n }) }}
              placeholder="Enter product name"
            />
            {fieldErrors.name && <p className="text-red-600 text-xs mt-1">{fieldErrors.name}</p>}
          </div>

          <div>
            <label className="label">Category *</label>
            <select
              className={inputClass('categoryId')}
              value={categoryId}
              onChange={(e) => { setCategoryId(e.target.value); setFieldErrors(p => { const n = { ...p }; delete n.categoryId; return n }) }}
            >
              <option value="">Select category</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {fieldErrors.categoryId && <p className="text-red-600 text-xs mt-1">{fieldErrors.categoryId}</p>}
          </div>

          <div>
            <label className="label">Brand</label>
            <select className="input" value={brandId} onChange={(e) => setBrandId(e.target.value)}>
              <option value="">Select brand</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Supplier</label>
            <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Select supplier</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Product description"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Pricing & Inventory</h3>

        <div className="space-y-4">
          {variants.map((variant, index) => (
            <div key={variant.id || `new_${index}`} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-600">Variant {index + 1}</span>
                {variants.length > 1 && (
                  <button type="button" onClick={() => removeVariant(index)} className="btn-danger btn-sm">
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="label">SKU *</label>
                  <input
                    type="text"
                    className={inputClass(`variant_${index}_sku`)}
                    value={variant.sku}
                    onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                    placeholder="SKU-001"
                  />
                  {fieldErrors[`variant_${index}_sku`] && (
                    <p className="text-red-600 text-xs mt-1">{fieldErrors[`variant_${index}_sku`]}</p>
                  )}
                </div>

                <div>
                  <label className="label">Barcode</label>
                  <input
                    type="text"
                    className="input"
                    value={variant.barcode}
                    onChange={(e) => updateVariant(index, 'barcode', e.target.value)}
                    placeholder="Barcode"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="label">Variant Name *</label>
                  <input
                    type="text"
                    className={inputClass(`variant_${index}_name`)}
                    value={variant.name}
                    onChange={(e) => updateVariant(index, 'name', e.target.value)}
                    placeholder="e.g. Large, Red, 500ml"
                  />
                  {fieldErrors[`variant_${index}_name`] && (
                    <p className="text-red-600 text-xs mt-1">{fieldErrors[`variant_${index}_name`]}</p>
                  )}
                </div>

                <div>
                  <label className="label">Cost Price *</label>
                  <input
                    type="number"
                    className={inputClass(`variant_${index}_costPrice`)}
                    step="0.01"
                    min="0"
                    value={variant.costPrice}
                    onChange={(e) => updateVariant(index, 'costPrice', e.target.value)}
                    placeholder="0.00"
                  />
                  {fieldErrors[`variant_${index}_costPrice`] && (
                    <p className="text-red-600 text-xs mt-1">{fieldErrors[`variant_${index}_costPrice`]}</p>
                  )}
                </div>

                <div>
                  <label className="label">Selling Price *</label>
                  <input
                    type="number"
                    className={inputClass(`variant_${index}_sellingPrice`)}
                    step="0.01"
                    min="0"
                    value={variant.sellingPrice}
                    onChange={(e) => updateVariant(index, 'sellingPrice', e.target.value)}
                    placeholder="0.00"
                  />
                  {fieldErrors[`variant_${index}_sellingPrice`] && (
                    <p className="text-red-600 text-xs mt-1">{fieldErrors[`variant_${index}_sellingPrice`]}</p>
                  )}
                </div>

                <div>
                  <label className="label">Stock Qty *</label>
                  <input
                    type="number"
                    className={inputClass(`variant_${index}_stockQuantity`)}
                    step="1"
                    min="0"
                    value={variant.stockQuantity}
                    onChange={(e) => updateVariant(index, 'stockQuantity', e.target.value)}
                    placeholder="0"
                  />
                  {fieldErrors[`variant_${index}_stockQuantity`] && (
                    <p className="text-red-600 text-xs mt-1">{fieldErrors[`variant_${index}_stockQuantity`]}</p>
                  )}
                </div>

                <div>
                  <label className="label">Alert Qty *</label>
                  <input
                    type="number"
                    className={inputClass(`variant_${index}_lowStockAlert`)}
                    step="1"
                    min="0"
                    value={variant.lowStockAlert}
                    onChange={(e) => updateVariant(index, 'lowStockAlert', e.target.value)}
                    placeholder="10"
                  />
                  {fieldErrors[`variant_${index}_lowStockAlert`] && (
                    <p className="text-red-600 text-xs mt-1">{fieldErrors[`variant_${index}_lowStockAlert`]}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button type="button" onClick={addVariant} className="btn-secondary btn-sm">
          + Add Variant
        </button>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button type="button" onClick={onCancel} className="btn-secondary" disabled={submitting}>
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
        </button>
      </div>
    </form>
  )
}
