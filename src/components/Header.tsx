import { useAppStore } from '@/stores/app.store'
import { Menu } from 'lucide-react'

export function Header() {
  const { currentPage, toggleSidebar } = useAppStore()

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3">
      <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-gray-100 lg:hidden">
        <Menu className="w-5 h-5" />
      </button>
      <h2 className="text-lg font-semibold text-gray-800">{currentPage}</h2>
    </header>
  )
}
