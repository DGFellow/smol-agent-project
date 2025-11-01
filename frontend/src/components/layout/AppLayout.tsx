import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { Header } from '@/components/header/Header'
import { Footer } from '@/components/footer/Footer'
import { ToastContainer } from '@/components/ui/ToastContainer'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const { sidebarExpanded } = useAppStore()

  return (
    <div className="min-h-screen flex flex-col">
      <div
        className={cn(
          'app-shell grid transition-all duration-300',
          // index.css drives the actual widths based on this class
          sidebarExpanded && 'expanded'
        )}
      >
        <Sidebar />

        <div className="app-content">
          <Header />
          <main className="flex-1 flex flex-col">
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>

      <ToastContainer />
    </div>
  )
}
