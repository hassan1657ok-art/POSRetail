import { HashRouter } from 'react-router-dom'
import { AppRoutes } from '@/routes'
import { ToastContainer } from '@/components/Toast'

export function App() {
  return (
    <HashRouter>
      <AppRoutes />
      <ToastContainer />
    </HashRouter>
  )
}
