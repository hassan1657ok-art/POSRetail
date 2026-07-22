import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { useAppStore } from '@/stores/app.store'
import {
  LayoutDashboard, Package, Users, ShoppingCart, Tags, Truck,
  BarChart3, Settings, ClipboardList, LogOut, ChevronLeft, X,
} from 'lucide-react'

const menuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Cashier'] },
  { path: '/products', label: 'Products', icon: Package, roles: ['Admin'] },
  { path: '/categories', label: 'Categories', icon: Tags, roles: ['Admin'] },
  { path: '/customers', label: 'Customers', icon: Users, roles: ['Admin', 'Cashier'] },
  { path: '/suppliers', label: 'Suppliers', icon: Truck, roles: ['Admin'] },
  { path: '/sales', label: 'Sales / POS', icon: ShoppingCart, roles: ['Admin', 'Cashier'] },
  { path: '/inventory', label: 'Inventory', icon: ClipboardList, roles: ['Admin'] },
  { path: '/reports', label: 'Reports', icon: BarChart3, roles: ['Admin'] },
  { path: '/settings', label: 'Settings', icon: Settings, roles: ['Admin'] },
]

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, isAdmin } = useAuthStore()
  const { sidebarOpen, setSidebarOpen, toggleSidebar } = useAppStore()

  const filtered = menuItems.filter(item => {
    return item.roles.includes(user?.role || '')
  })

  const handleNav = (path: string, label: string) => {
    navigate(path)
    useAppStore.getState().setCurrentPage(label)
    if (window.innerWidth < 1024) setSidebarOpen(false)
  }

  return (
    <>
      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-16'} fixed lg:relative z-30 h-full w-60 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200`}>
        <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200">
          {sidebarOpen && (
            <span className="font-bold text-lg">
              <span className="text-blue-600">Retail</span> <span className="text-gray-700">POS</span>
            </span>
          )}
          {sidebarOpen ? (
            <button onClick={toggleSidebar} className="btn-ghost btn-sm p-1.5 hidden lg:flex">
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={toggleSidebar} className="btn-ghost btn-sm p-1.5 hidden lg:flex mx-auto">
              <ChevronLeft className="w-4 h-4 rotate-180" />
            </button>
          )}
          <button onClick={() => setSidebarOpen(false)} className="btn-ghost btn-sm p-1.5 lg:hidden">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-auto py-2 px-2 space-y-0.5">
          {filtered.map(item => {
            const active = location.pathname === item.path
            const Icon = item.icon
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path, item.label)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </button>
            )
          })}
        </nav>

        <div className="border-t border-gray-200 p-3 space-y-2">
          {sidebarOpen && (
            <div className="px-2 py-1 text-xs">
              <p className="font-medium text-gray-700 truncate">{user?.fullName}</p>
              <p className="text-gray-400">{user?.role}</p>
            </div>
          )}
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>
    </>
  )
}
