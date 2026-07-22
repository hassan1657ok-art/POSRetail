import { useEffect } from 'react'
import { Outlet, useNavigate, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { LoadingSpinner } from './LoadingSpinner'

export function Layout() {
  const { user, loading, checkSession } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => { checkSession() }, [])

  if (loading) return <LoadingSpinner fullScreen />
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
