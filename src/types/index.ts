export interface Business {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  logo: string | null
  currency: string
  taxRate: number
  taxName: string
  receiptFooter: string | null
}

export interface User {
  id: string
  businessId: string
  roleId: string
  username: string
  fullName: string
  pin: string | null
  isActive: boolean
  role?: Role
}

export interface AuthUser {
  id: string
  username: string
  fullName: string
  role: string
  businessId: string
}

export interface Role {
  id: string
  name: string
  permissions: string
}

export interface Category {
  id: string
  name: string
  slug: string
  parentId: string | null
  isActive: boolean
  _count?: { products: number }
}

export interface Brand {
  id: string
  name: string
  isActive: boolean
  _count?: { products: number }
}

export interface Product {
  id: string
  categoryId: string
  brandId: string | null
  supplierId: string | null
  name: string
  slug: string
  description: string | null
  isActive: boolean
  category?: Category
  brand?: Brand
  supplier?: Supplier
  variants: ProductVariant[]
  images: ProductImage[]
}

export interface ProductVariant {
  id: string
  productId: string
  sku: string
  barcode: string | null
  name: string
  costPrice: number
  sellingPrice: number
  stockQuantity: number
  lowStockAlert: number
  weight: string | null
  size: string | null
  color: string | null
  isActive: boolean
  product?: Product
  woocommerceProductId?: string | null
}

export interface ProductImage {
  id: string
  productId: string
  variantId: string | null
  url: string
  isPrimary: boolean
}

export interface Customer {
  id: string
  fullName: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  notes: string | null
  totalSpent: number
  isWalkIn: boolean
}

export interface Supplier {
  id: string
  name: string
  contactPerson: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  isActive: boolean
}

export interface Sale {
  id: string
  customerId: string
  userId: string
  invoiceNo: string
  subtotal: number
  discountRate: number
  discountAmt: number
  taxRate: number
  taxAmt: number
  grandTotal: number
  totalPaid: number
  change: number
  status: string
  note: string | null
  createdAt: string
  customer?: Customer
  user?: User
  items: SaleItem[]
  payments: Payment[]
}

export interface SaleItem {
  id: string
  saleId: string
  variantId: string
  productName: string
  variantName: string
  sku: string
  quantity: number
  unitPrice: number
  discount: number
  lineTotal: number
}

export interface Payment {
  id: string
  saleId: string
  method: string
  amount: number
  reference: string | null
}

export interface InventoryMovement {
  id: string
  variantId: string
  userId: string
  type: string
  quantity: number
  previousQty: number
  newQty: number
  reason: string | null
  reference: string | null
  createdAt: string
  variant?: ProductVariant & { product: Product }
  user?: { fullName: string }
}

export interface DashboardStats {
  productCount: number
  customerCount: number
  salesTodayCount: number
  totalSalesToday: number
  lowStockItems: (ProductVariant & { product: Product })[]
  recentSales: Sale[]
  pendingNotifications: number
}

export interface CartItem {
  variantId: string
  productName: string
  variantName: string
  sku: string
  quantity: number
  unitPrice: number
  discount: number
}

export interface CartPayment {
  method: string
  amount: number
  reference?: string
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export interface ActivityLog {
  id: string
  userId: string
  action: string
  entity: string
  entityId: string | null
  details: string | null
  createdAt: string
  user?: { fullName: string; username: string }
}

declare global {
  interface Window {
    api: {
      invoke(channel: string, ...args: unknown[]): Promise<unknown>
    }
  }
}
