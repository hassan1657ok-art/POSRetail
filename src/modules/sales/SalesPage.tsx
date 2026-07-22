import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useCartStore } from '@/stores/cart.store'
import { useToastStore } from '@/stores/toast.store'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import type { Product, ProductVariant, Customer } from '@/types'
import { Search, User, Plus, Minus, Trash2, X, Banknote, CreditCard, Printer } from 'lucide-react'

const RECENT_STORAGE_KEY = 'pos_recent_variants'
const MAX_RECENT = 12

interface RecentEntry {
  variant: ProductVariant
  productId: string
  productName: string
}

function getRecentEntries(): RecentEntry[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function addRecentEntry(variant: ProductVariant, product: Product): RecentEntry[] {
  const entries = getRecentEntries().filter(e => e.variant.id !== variant.id)
  entries.unshift({
    variant,
    productId: product.id,
    productName: product.name,
  })
  const trimmed = entries.slice(0, MAX_RECENT)
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(trimmed))
  return trimmed
}

type FlatResult = { variant: ProductVariant; product: Product }

export default function SalesPage() {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const customerDropdownRef = useRef<HTMLDivElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()
  const customerTimer = useRef<ReturnType<typeof setTimeout>>()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [searchError, setSearchError] = useState('')

  const [customerQuery, setCustomerQuery] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false)

  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentError, setPaymentError] = useState('')

  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>(getRecentEntries)

  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [isClearingCart, setIsClearingCart] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [showReceipt, setShowReceipt] = useState(false)
  const [removingItemIds, setRemovingItemIds] = useState<Set<string>>(new Set())

  const items = useCartStore(s => s.items)
  const customer = useCartStore(s => s.customer)
  const discountRate = useCartStore(s => s.discountRate)
  const discountAmt = useCartStore(s => s.discountAmt)
  const taxRate = useCartStore(s => s.taxRate)
  const payments = useCartStore(s => s.payments)
  const lastSale = useCartStore(s => s.lastSale)
  const note = useCartStore(s => s.note)

  const addItem = useCartStore(s => s.addItem)
  const removeItem = useCartStore(s => s.removeItem)
  const updateQuantity = useCartStore(s => s.updateQuantity)
  const updateDiscount = useCartStore(s => s.updateDiscount)
  const setCustomer = useCartStore(s => s.setCustomer)
  const setDiscountRate = useCartStore(s => s.setDiscountRate)
  const setDiscountAmt = useCartStore(s => s.setDiscountAmt)
  const setTaxRate = useCartStore(s => s.setTaxRate)
  const setNote = useCartStore(s => s.setNote)
  const addPayment = useCartStore(s => s.addPayment)
  const removePayment = useCartStore(s => s.removePayment)
  const checkout = useCartStore(s => s.checkout)
  const resetCart = useCartStore(s => s.resetCart)
  const computeSubtotal = useCartStore(s => s.computeSubtotal)
  const computeDiscountAmount = useCartStore(s => s.computeDiscountAmount)
  const computeTax = useCartStore(s => s.computeTax)
  const computeGrandTotal = useCartStore(s => s.computeGrandTotal)
  const computeTotalPaid = useCartStore(s => s.computeTotalPaid)
  const computeChange = useCartStore(s => s.computeChange)

  const addToast = useToastStore(s => s.addToast)

  const fetchTaxRate = useCallback(() => {
    api.settings.getBusiness().then(business => {
      useCartStore.getState().setTaxRate(business.taxRate)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    fetchTaxRate()
  }, [fetchTaxRate])

  useEffect(() => {
    if (customerQuery.length === 0) {
      setCustomerResults([])
      return
    }
    if (customerTimer.current) clearTimeout(customerTimer.current)
    setIsSearchingCustomer(true)
    customerTimer.current = setTimeout(() => {
      api.customers.search(customerQuery)
        .then(setCustomerResults)
        .catch(() => setCustomerResults([]))
        .finally(() => setIsSearchingCustomer(false))
    }, 300)
    return () => {
      if (customerTimer.current) clearTimeout(customerTimer.current)
    }
  }, [customerQuery])

  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (trimmed.length === 0) {
      if (searchTimer.current) clearTimeout(searchTimer.current)
      setIsSearching(false)
      if (!hasSearched) return
      setSearchResults([])
      return
    }
    if (searchTimer.current) clearTimeout(searchTimer.current)
    setIsSearching(true)
    setSearchError('')
    setHasSearched(true)
    searchTimer.current = setTimeout(() => {
      api.products.search(trimmed)
        .then(results => setSearchResults(results))
        .catch(() => setSearchError('Search failed. Please try again.'))
        .finally(() => setIsSearching(false))
    }, 300)
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [searchQuery, hasSearched])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setCustomerResults([])
        setCustomerQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === 'Enter') || e.key === 'F8') {
        e.preventDefault()
        handleCompleteSale()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  })

  const flatResults: FlatResult[] = useMemo(() => {
    return searchResults.flatMap(product =>
      product.variants
        .filter(v => v.isActive)
        .map(variant => ({ variant, product }))
    )
  }, [searchResults])

  const cartEmpty = items.length === 0

  const subtotal = computeSubtotal()
  const storeDiscountAmt = computeDiscountAmount()
  const displayedDiscountAmt = Math.min(storeDiscountAmt, subtotal)
  const taxAmount = computeTax()
  const grandTotal = computeGrandTotal()
  const totalPaid = computeTotalPaid()
  const change = computeChange()
  const remaining = grandTotal - totalPaid

  const handleAddVariant = useCallback((variant: ProductVariant, product: Product) => {
    addItem(variant, product)
    setRecentEntries(addRecentEntry(variant, product))
    setSearchQuery('')
    setSearchResults([])
    setHasSearched(false)
    setSearchError('')
    searchInputRef.current?.focus()
  }, [addItem])

  const handleRemoveItem = useCallback((variantId: string) => {
    setRemovingItemIds(prev => new Set(prev).add(variantId))
    setTimeout(() => {
      removeItem(variantId)
      setRemovingItemIds(prev => {
        const next = new Set(prev)
        next.delete(variantId)
        return next
      })
    }, 150)
  }, [removeItem])

  const handleSelectCustomer = useCallback((cust: Customer) => {
    setCustomer(cust)
    setCustomerQuery(cust.fullName)
    setCustomerResults([])
  }, [setCustomer])

  const handleClearCustomer = useCallback(() => {
    setCustomer(null)
    setCustomerQuery('')
    setCustomerResults([])
  }, [setCustomer])

  const handleAddPayment = useCallback(() => {
    const amt = parseFloat(paymentAmount)
    if (isNaN(amt) || amt <= 0) {
      setPaymentError('Enter a valid amount')
      return
    }
    setPaymentError('')
    addPayment({ method: paymentMethod, amount: amt })
    setPaymentAmount('')
  }, [paymentAmount, paymentMethod, addPayment])

  const handlePaymentKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddPayment()
    }
  }, [handleAddPayment])

  const handleCompleteSale = useCallback(async () => {
    if (items.length === 0) {
      setCheckoutError('Cart is empty')
      return
    }
    setIsCheckingOut(true)
    setCheckoutError('')
    try {
      await checkout()
      setShowReceipt(true)
      addToast({ type: 'success', title: 'Sale completed successfully' })
    } catch {
      setCheckoutError('Checkout failed. Please try again.')
      addToast({ type: 'error', title: 'Checkout failed', message: 'Please try again.' })
    } finally {
      setIsCheckingOut(false)
    }
  }, [items.length, checkout, addToast])

  const handleNewSale = useCallback(() => {
    setShowReceipt(false)
    resetCart()
    fetchTaxRate()
    setSearchQuery('')
    setSearchResults([])
    setHasSearched(false)
    setSearchError('')
    setCustomerQuery('')
    setCustomerResults([])
    setPaymentAmount('')
    setPaymentError('')
    setCheckoutError('')
    searchInputRef.current?.focus()
  }, [resetCart, fetchTaxRate])

  const handleClearCart = useCallback(() => {
    setIsClearingCart(true)
    setTimeout(() => {
      resetCart()
      setIsClearingCart(false)
      addToast({ type: 'info', title: 'Cart cleared' })
    }, 200)
  }, [resetCart, addToast])

  const receipt = lastSale && showReceipt ? lastSale : null

  if (receipt) {
    return (
      <div className="h-full flex items-start justify-center p-6 overflow-auto bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 w-full max-w-lg">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Sale Completed</h2>
            <p className="text-sm text-gray-500 mt-1">Invoice #{receipt.invoiceNo}</p>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Customer</span>
              <span className="font-medium text-gray-900">{receipt.customer?.fullName || 'Walk-in Customer'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Items</span>
              <span className="font-medium text-gray-900">{receipt.items.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-700">{formatCurrency(receipt.subtotal)}</span>
            </div>
            {receipt.discountAmt > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(receipt.discountAmt)}</span>
              </div>
            )}
            {receipt.taxAmt > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Tax ({receipt.taxRate}%)</span>
                <span className="text-gray-700">{formatCurrency(receipt.taxAmt)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold border-t border-gray-200 pt-3">
              <span className="text-gray-900">Grand Total</span>
              <span className="text-gray-900">{formatCurrency(receipt.grandTotal)}</span>
            </div>
            {receipt.payments.map((p, i) => (
              <div key={i} className="flex justify-between text-xs text-gray-500">
                <span className="capitalize">Paid ({p.method})</span>
                <span>{formatCurrency(p.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between">
              <span className="text-gray-500">Total Paid</span>
              <span className="font-medium text-gray-900">{formatCurrency(receipt.totalPaid)}</span>
            </div>
            {receipt.change > 0 && (
              <div className="flex justify-between text-blue-600 font-semibold">
                <span>Change</span>
                <span>{formatCurrency(receipt.change)}</span>
              </div>
            )}
          </div>

          {receipt.note && (
            <div className="border-t border-gray-100 mt-4 pt-3">
              <span className="text-xs text-gray-500">Note:</span>
              <p className="text-sm text-gray-700 mt-0.5">{receipt.note}</p>
            </div>
          )}

          <div className="border-t border-gray-100 mt-4 pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Items</h3>
            <div className="space-y-2 max-h-48 overflow-auto">
              {receipt.items.map(item => (
                <div key={item.id} className="flex justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                  <span className="truncate flex-1 mr-2 text-gray-700">
                    {item.productName} {item.variantName && `(${item.variantName})`}
                    <span className="text-gray-400 ml-1">x{item.quantity}</span>
                  </span>
                  <span className="text-gray-600 font-medium">{formatCurrency(item.lineTotal)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleNewSale}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-sm"
            >
              New Sale
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors text-sm"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex gap-4 p-4 overflow-hidden bg-gray-50">
      {/* ==================== LEFT PANEL ==================== */}
      <div className="w-[60%] flex flex-col min-w-0">
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-shadow"
            placeholder="Search by name, SKU, or scan barcode..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value)
              if (e.target.value.trim().length === 0) {
                setHasSearched(false)
                setSearchResults([])
                setSearchError('')
              }
            }}
            autoFocus
          />
          {isSearching && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
          )}
        </div>

        {searchError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700 flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{searchError}</span>
          </div>
        )}

        <div className="flex-1 overflow-auto -mx-1 px-1">
          {!hasSearched && !isSearching ? (
            <div className="space-y-5">
              {recentEntries.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Recent Products
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {recentEntries.map(entry => (
                      <button
                        key={entry.variant.id}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-all shadow-sm"
                        onClick={() => {
                          const product: Product = {
                            id: entry.productId,
                            categoryId: '',
                            brandId: null,
                            supplierId: null,
                            name: entry.productName,
                            slug: '',
                            description: null,
                            isActive: true,
                            variants: [],
                            images: [],
                          }
                          addItem(entry.variant, product)
                          searchInputRef.current?.focus()
                        }}
                      >
                        <span className="font-medium truncate max-w-[140px]">{entry.productName}</span>
                        {entry.variant.name && entry.variant.name !== entry.productName && (
                          <span className="text-xs text-gray-400 truncate max-w-[80px]">({entry.variant.name})</span>
                        )}
                        <span className="text-xs font-semibold text-blue-600 ml-0.5">
                          {formatCurrency(entry.variant.sellingPrice)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {recentEntries.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 pt-12">
                  <Search className="w-16 h-16 mb-4 stroke-1" />
                  <p className="text-sm font-medium text-gray-500">Search for products to add to cart</p>
                  <p className="text-xs mt-1.5 text-gray-400">Type a name, SKU, or scan a barcode</p>
                </div>
              )}
            </div>
          ) : isSearching ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : flatResults.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Results ({flatResults.length})
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {flatResults.map(({ variant, product }) => (
                  <button
                    key={variant.id}
                    className={`bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-blue-400 hover:shadow-md transition-all ${
                      variant.stockQuantity <= 0 ? 'opacity-50 pointer-events-none' : 'cursor-pointer'
                    }`}
                    onClick={() => handleAddVariant(variant, product)}
                    disabled={variant.stockQuantity <= 0}
                  >
                    <div className="text-sm font-semibold text-gray-900 truncate">{product.name}</div>
                    {variant.name && variant.name !== product.name && (
                      <div className="text-xs text-gray-500 truncate mt-0.5">{variant.name}</div>
                    )}
                    <div className="text-xs text-gray-400 truncate mt-0.5">{variant.sku}</div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold text-gray-900">
                        {formatCurrency(variant.sellingPrice)}
                      </span>
                      {variant.stockQuantity <= variant.lowStockAlert && variant.stockQuantity > 0 && (
                        <span className="text-xs font-medium px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">Low</span>
                      )}
                      {variant.stockQuantity <= 0 && (
                        <span className="text-xs font-medium px-2 py-0.5 bg-red-100 text-red-700 rounded-full">Out</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : hasSearched && !isSearching ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 pt-12">
              <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
              <p className="text-sm font-medium text-gray-500">No products found</p>
              <p className="text-xs mt-1.5 text-gray-400">Try a different search term</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* ==================== RIGHT PANEL ==================== */}
      <div className="w-[40%] flex flex-col min-w-0">
        {/* Customer Selector */}
        <div className="relative mb-4" ref={customerDropdownRef}>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Customer
          </label>
          {customer ? (
            <div className="flex gap-2">
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex-1 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm font-medium text-gray-900 truncate">{customer.fullName}</span>
                  {customer.phone && (
                    <span className="text-xs text-gray-400 shrink-0">{customer.phone}</span>
                  )}
                </div>
                {customer.isWalkIn && (
                  <span className="text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full ml-2 shrink-0">
                    Walk-in
                  </span>
                )}
              </div>
              <button
                onClick={handleClearCustomer}
                className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors shrink-0"
                title="Clear customer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                placeholder="Search customer or use Walk-in..."
                value={customerQuery}
                onChange={e => setCustomerQuery(e.target.value)}
              />
            </div>
          )}

          {customerResults.length > 0 && !customer && (
            <div className="absolute z-10 w-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-auto">
              {customerResults.map(cust => (
                <button
                  key={cust.id}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 flex items-center justify-between transition-colors"
                  onClick={() => handleSelectCustomer(cust)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="font-medium text-gray-900 truncate">{cust.fullName}</span>
                    {cust.phone && <span className="text-xs text-gray-400 shrink-0">{cust.phone}</span>}
                  </div>
                  {cust.isWalkIn && (
                    <span className="text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full shrink-0">
                      Walk-in
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {isSearchingCustomer && customerQuery.length > 0 && !customer && (
            <div className="absolute z-10 w-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-center">
              <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
            </div>
          )}
        </div>

        {/* Note Input */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Note
          </label>
          <input
            type="text"
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            placeholder="Add a note for this sale..."
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        {/* Cart Items */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-700">
              Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
            </h3>
            {!cartEmpty && (
              <button
                onClick={handleClearCart}
                disabled={isClearingCart}
                className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
              >
                {isClearingCart ? 'Clearing...' : 'Clear Cart'}
              </button>
            )}
          </div>

          {cartEmpty ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
              <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              <p className="text-xs font-medium text-gray-400">Cart is empty</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto -mx-2 px-2 space-y-2">
              {items.map(item => {
                const lineTotal = item.unitPrice * item.quantity - item.discount
                const isRemoving = removingItemIds.has(item.variantId)
                return (
                  <div
                    key={item.variantId}
                    className={`bg-white border border-gray-200 rounded-xl p-3.5 transition-all ${
                      isRemoving ? 'opacity-30 scale-95' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{item.productName}</div>
                        {item.variantName && item.variantName !== item.productName && (
                          <div className="text-xs text-gray-500 truncate mt-0.5">{item.variantName}</div>
                        )}
                        <div className="text-xs text-gray-400">{item.sku}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatCurrency(item.unitPrice)} each
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.variantId)}
                        disabled={isRemoving}
                        className="text-gray-300 hover:text-red-500 shrink-0 disabled:opacity-50 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-100 transition-colors text-sm"
                          onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                          disabled={isRemoving}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 py-1.5 text-sm font-semibold text-gray-900 min-w-[2.5rem] text-center bg-gray-50">
                          {item.quantity}
                        </span>
                        <button
                          className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-100 transition-colors text-sm"
                          onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          disabled={isRemoving}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex-1" />

                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-gray-400 font-medium">Disc</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-20 px-2 py-1.5 text-xs text-right bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={item.discount || ''}
                          onChange={e => {
                            const v = parseFloat(e.target.value) || 0
                            updateDiscount(item.variantId, Math.max(0, v))
                          }}
                          disabled={isRemoving}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-gray-100">
                      <span className="text-xs text-gray-400 font-medium">Line Total</span>
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(lineTotal)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Cart Summary */}
          {!cartEmpty && (
            <div className="border-t border-gray-200 pt-4 mt-3 space-y-2.5 text-sm shrink-0">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-semibold text-gray-900">{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 flex-1">
                  <label className="text-gray-500 text-xs whitespace-nowrap">Disc %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-2 py-1.5 text-xs text-right bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={discountRate || ''}
                    onChange={e => {
                      const v = parseFloat(e.target.value) || 0
                      setDiscountRate(Math.max(0, Math.min(100, v)))
                      if (v > 0) setDiscountAmt(0)
                    }}
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-1">
                  <label className="text-gray-500 text-xs whitespace-nowrap">Flat</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full px-2 py-1.5 text-xs text-right bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={discountAmt || ''}
                    onChange={e => {
                      const v = parseFloat(e.target.value) || 0
                      setDiscountAmt(Math.max(0, v))
                      if (v > 0) setDiscountRate(0)
                    }}
                  />
                </div>
              </div>

              {displayedDiscountAmt > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Discount</span>
                  <span>-{formatCurrency(displayedDiscountAmt)}</span>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <label className="text-gray-500 text-xs whitespace-nowrap">Tax %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-20 px-2 py-1.5 text-xs text-right bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={taxRate || ''}
                  onChange={e => {
                    const v = parseFloat(e.target.value) || 0
                    setTaxRate(Math.max(0, Math.min(100, v)))
                  }}
                />
              </div>

              {taxRate > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tax Amount</span>
                  <span className="text-gray-900">{formatCurrency(taxAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2.5">
                <span className="text-gray-900">Grand Total</span>
                <span className="text-gray-900">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          )}

          {/* Payment Section */}
          {!cartEmpty && (
            <div className="border-t border-gray-200 pt-4 mt-3 shrink-0">
              <h4 className="text-sm font-bold text-gray-700 mb-3">Payment</h4>

              {payments.length > 0 && (
                <div className="space-y-1.5 mb-3 max-h-28 overflow-auto">
                  {payments.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2 border border-gray-100"
                    >
                      <span className="capitalize font-semibold text-gray-700 flex items-center gap-1.5">
                        {p.method === 'cash' ? (
                          <Banknote className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                        )}
                        {p.method}
                      </span>
                      <span className="font-medium text-gray-900">{formatCurrency(p.amount)}</span>
                      <button
                        onClick={() => {
                          removePayment(i)
                          addToast({ type: 'info', title: 'Payment removed' })
                        }}
                        className="text-gray-400 hover:text-red-500 ml-2 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <select
                  className="w-24 px-2 py-2 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank">Bank</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Amount"
                  value={paymentAmount}
                  onChange={e => {
                    setPaymentAmount(e.target.value)
                    setPaymentError('')
                  }}
                  onKeyDown={handlePaymentKeyDown}
                />
                <button
                  onClick={handleAddPayment}
                  className="px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                >
                  Add
                </button>
              </div>
              {paymentError && (
                <p className="text-xs text-red-500 mt-1.5">{paymentError}</p>
              )}

              <div className="flex justify-between text-xs mt-3">
                <span className="text-gray-500">Total Paid</span>
                <span className="font-semibold text-gray-900">{formatCurrency(totalPaid)}</span>
              </div>

              {totalPaid > 0 && remaining > 0 && (
                <div className="flex justify-between text-xs text-red-500 font-semibold mt-1">
                  <span>Remaining</span>
                  <span>{formatCurrency(remaining)}</span>
                </div>
              )}

              {change > 0 && (
                <div className="flex justify-between text-xs text-green-600 font-semibold mt-1">
                  <span>Change</span>
                  <span>{formatCurrency(change)}</span>
                </div>
              )}
            </div>
          )}

          {/* Checkout */}
          {!cartEmpty && (
            <div className="mt-4 shrink-0">
              {checkoutError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 text-sm text-red-700 flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {checkoutError}
                </div>
              )}
              <button
                onClick={handleCompleteSale}
                disabled={isCheckingOut}
                className="w-full py-3.5 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold rounded-xl transition-colors text-base shadow-sm"
              >
                {isCheckingOut ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Complete Sale — {formatCurrency(grandTotal)}
                    <span className="text-xs font-normal opacity-70 ml-1">(Ctrl+Enter)</span>
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
