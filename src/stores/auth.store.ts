import { create } from 'zustand'
import type { AuthUser } from '@/types'
import { api } from '@/lib/api'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  login: (username: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  checkSession: () => Promise<void>
  hasPermission: (permission: string) => boolean
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,

  login: async (username, password) => {
    const user = await api.auth.login(username, password)
    set({ user, loading: false })
    return user
  },

  logout: async () => {
    try { await api.auth.logout() } catch { /* ignore */ }
    set({ user: null, loading: false })
  },

  checkSession: async () => {
    set({ loading: true })
    try {
      const user = await api.auth.currentUser()
      set({ user, loading: false })
    } catch {
      set({ user: null, loading: false })
    }
  },

  hasPermission: (permission) => {
    const user = get().user
    if (!user) return false
    if (user.role === 'Admin') return true
    return permission.startsWith('sales:') || permission.startsWith('products:view') || permission.startsWith('customers:')
  },

  isAdmin: () => {
    return get().user?.role === 'Admin'
  },
}))
