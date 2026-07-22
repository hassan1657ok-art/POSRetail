import { create } from 'zustand'
import type { CartItem, CartPayment, ProductVariant, Product, Customer, Sale } from '@/types'
import { api } from '@/lib/api'

interface CartState {
  items: CartItem[]
  customer: Customer | null
  discountRate: number
  discountAmt: number
  taxRate: number
  payments: CartPayment[]
  note: string
  lastSale: Sale | null
  addItem: (variant: ProductVariant, product: Product) => void
  removeItem: (variantId: string) => void
  updateQuantity: (variantId: string, quantity: number) => void
  updateDiscount: (variantId: string, discount: number) => void
  setCustomer: (customer: Customer | null) => void
  setDiscountRate: (rate: number) => void
  setDiscountAmt: (amt: number) => void
  setTaxRate: (rate: number) => void
  addPayment: (payment: CartPayment) => void
  removePayment: (index: number) => void
  setNote: (note: string) => void
  computeSubtotal: () => number
  computeDiscountAmount: () => number
  computeAfterDiscount: () => number
  computeTax: () => number
  computeGrandTotal: () => number
  computeTotalPaid: () => number
  computeChange: () => number
  checkout: () => Promise<Sale>
  clearCart: () => void
  resetCart: () => void
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customer: null,
  discountRate: 0,
  discountAmt: 0,
  taxRate: 0,
  payments: [],
  note: '',
  lastSale: null,

  addItem: (variant, product) => {
    const items = get().items
    const idx = items.findIndex(i => i.variantId === variant.id)
    if (idx >= 0) {
      set({
        items: items.map((i, j) => j === idx ? { ...i, quantity: i.quantity + 1 } : i),
      })
    } else {
      set({
        items: [...items, {
          variantId: variant.id,
          productName: product.name,
          variantName: variant.name,
          sku: variant.sku,
          quantity: 1,
          unitPrice: variant.sellingPrice,
          discount: 0,
        }],
      })
    }
  },

  removeItem: (variantId) => set(s => ({ items: s.items.filter(i => i.variantId !== variantId) })),

  updateQuantity: (variantId, quantity) => {
    if (quantity <= 0) { get().removeItem(variantId); return }
    set(s => ({ items: s.items.map(i => i.variantId === variantId ? { ...i, quantity } : i) }))
  },

  updateDiscount: (variantId, discount) =>
    set(s => ({ items: s.items.map(i => i.variantId === variantId ? { ...i, discount } : i) })),

  setCustomer: (customer) => set({ customer }),
  setDiscountRate: (rate) => set({ discountRate: rate }),
  setDiscountAmt: (amt) => set({ discountAmt: amt }),
  setTaxRate: (rate) => set({ taxRate: rate }),
  addPayment: (payment) => set(s => ({ payments: [...s.payments, payment] })),
  removePayment: (index) => set(s => ({ payments: s.payments.filter((_, i) => i !== index) })),
  setNote: (note) => set({ note }),

  computeSubtotal: () => get().items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
  computeDiscountAmount: () => {
    const s = get()
    return s.discountAmt || (s.computeSubtotal() * s.discountRate / 100)
  },
  computeAfterDiscount: () => {
    const subtotal = get().computeSubtotal()
    return Math.max(0, subtotal - get().computeDiscountAmount())
  },
  computeTax: () => get().computeAfterDiscount() * get().taxRate / 100,
  computeGrandTotal: () => get().computeAfterDiscount() + get().computeTax(),
  computeTotalPaid: () => get().payments.reduce((s, p) => s + p.amount, 0),
  computeChange: () => Math.max(0, get().computeTotalPaid() - get().computeGrandTotal()),

  checkout: async () => {
    const s = get()
    const walkIn = await api.customers.search('walk-in')
    const customerId = s.customer?.id || walkIn[0]?.id

    if (!customerId) throw new Error('No customer selected')

    const sale = await api.sales.create({
      customerId,
      items: s.items,
      payments: s.payments,
      discountRate: s.discountRate,
      discountAmt: s.discountAmt,
      taxRate: s.taxRate,
      note: s.note,
    })

    set({ lastSale: sale })
    get().resetCart()
    return sale
  },

  clearCart: () => set({
    items: [],
    customer: null,
    discountRate: 0,
    discountAmt: 0,
    payments: [],
    note: '',
    lastSale: null,
  }),

  resetCart: () => set({
    items: [],
    customer: null,
    discountRate: 0,
    discountAmt: 0,
    payments: [],
    note: '',
  }),
}))
