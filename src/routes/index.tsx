import { Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/modules/auth/LoginPage'
import DashboardPage from '@/modules/dashboard/DashboardPage'
import { ProductsPage } from '@/modules/products/ProductsPage'
import { CategoriesPage } from '@/modules/categories/CategoriesPage'
import { CustomersPage } from '@/modules/customers/CustomersPage'
import { SuppliersPage } from '@/modules/suppliers/SuppliersPage'
import SalesPage from '@/modules/sales/SalesPage'
import { InventoryPage } from '@/modules/inventory/InventoryPage'
import ReportsPage from '@/modules/reports/ReportsPage'
import { SettingsPage } from '@/modules/settings/SettingsPage'

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h1 className="text-6xl font-bold text-gray-200">404</h1>
      <p className="text-gray-500 mt-3 text-lg">Page not found</p>
      <a href="#/" className="btn-primary mt-6">Back to Dashboard</a>
    </div>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
