import type {
  AuthUser, DashboardStats, Category, Brand, Product, ProductVariant,
  Customer, Supplier, Sale, InventoryMovement, Notification, ActivityLog, Business,
} from '@/types'

function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  return window.api.invoke(channel, ...args) as Promise<T>
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      invoke<AuthUser>('auth:login', username, password),
    logout: () => invoke<{ success: boolean }>('auth:logout'),
    currentUser: () => invoke<AuthUser | null>('auth:currentUser'),
  },

  dashboard: {
    stats: () => invoke<DashboardStats>('dashboard:stats'),
  },

  categories: {
    getAll: () => invoke<Category[]>('categories:getAll'),
    create: (data: { name: string; slug: string; parentId?: string }) =>
      invoke<Category>('categories:create', data),
    update: (id: string, data: Partial<Category>) =>
      invoke<Category>('categories:update', id, data),
    delete: (id: string) => invoke<Category>('categories:delete', id),
  },

  brands: {
    getAll: () => invoke<Brand[]>('brands:getAll'),
    create: (data: { name: string }) => invoke<Brand>('brands:create', data),
    update: (id: string, data: Partial<Brand>) => invoke<Brand>('brands:update', id, data),
    delete: (id: string) => invoke<Brand>('brands:delete', id),
  },

  products: {
    getAll: () => invoke<Product[]>('products:getAll'),
    getById: (id: string) => invoke<Product>('products:getById', id),
    create: (data: Record<string, unknown>) => invoke<Product>('products:create', data),
    update: (id: string, data: Record<string, unknown>) => invoke<Product>('products:update', id, data),
    delete: (id: string) => invoke<void>('products:delete', id),
    search: (query: string) => invoke<Product[]>('products:search', query),
  },

  variants: {
    getByProduct: (productId: string) => invoke<ProductVariant[]>('variants:getByProduct', productId),
    create: (data: Record<string, unknown>) => invoke<ProductVariant>('variants:create', data),
    update: (id: string, data: Record<string, unknown>) => invoke<ProductVariant>('variants:update', id, data),
    delete: (id: string) => invoke<void>('variants:delete', id),
  },

  customers: {
    getAll: () => invoke<Customer[]>('customers:getAll'),
    create: (data: Record<string, unknown>) => invoke<Customer>('customers:create', data),
    update: (id: string, data: Record<string, unknown>) => invoke<Customer>('customers:update', id, data),
    delete: (id: string) => invoke<void>('customers:delete', id),
    search: (query: string) => invoke<Customer[]>('customers:search', query),
  },

  suppliers: {
    getAll: () => invoke<Supplier[]>('suppliers:getAll'),
    create: (data: Record<string, unknown>) => invoke<Supplier>('suppliers:create', data),
    update: (id: string, data: Record<string, unknown>) => invoke<Supplier>('suppliers:update', id, data),
    delete: (id: string) => invoke<void>('suppliers:delete', id),
  },

  sales: {
    getAll: () => invoke<Sale[]>('sales:getAll'),
    getById: (id: string) => invoke<Sale>('sales:getById', id),
    create: (data: Record<string, unknown>) => invoke<Sale>('sales:create', data),
    getByDateRange: (start: string, end: string) => invoke<Sale[]>('sales:getByDateRange', start, end),
    getByInvoiceNo: (invoiceNo: string) => invoke<Sale>('sales:getByInvoiceNo', invoiceNo),
  },

  inventory: {
    getMovements: (variantId?: string) => invoke<InventoryMovement[]>('inventory:getMovements', variantId),
    adjust: (data: { variantId: string; quantity: number; reason: string; reference?: string }) =>
      invoke<InventoryMovement>('inventory:adjust', data),
    getLowStock: () => invoke<ProductVariant[]>('inventory:getLowStock'),
  },

  reports: {
    salesSummary: (start: string, end: string) => invoke<Record<string, unknown>>('reports:salesSummary', start, end),
    profitLoss: (start: string, end: string) => invoke<Record<string, unknown>>('reports:profitLoss', start, end),
    inventoryValuation: () => invoke<Record<string, unknown>>('reports:inventoryValuation'),
    topProducts: (start: string, end: string, limit?: number) =>
      invoke<Record<string, unknown>[]>('reports:topProducts', start, end, limit || 10),
    cashierSummary: (start: string, end: string) =>
      invoke<Record<string, unknown>[]>('reports:cashierSummary', start, end),
  },

  settings: {
    getBusiness: () => invoke<Business>('settings:getBusiness'),
    updateBusiness: (data: Record<string, unknown>) => invoke<Business>('settings:updateBusiness', data),
    exportDB: () => invoke<{ success: boolean; path?: string }>('settings:exportDB'),
  },

  activity: {
    getLogs: () => invoke<ActivityLog[]>('activity:getLogs'),
  },

  notifications: {
    getAll: () => invoke<Notification[]>('notifications:getAll'),
    markRead: (id: string) => invoke<void>('notifications:markRead', id),
  },
}
