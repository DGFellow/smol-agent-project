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
          // Keep the base shell classes
          'app-shell grid transition-all duration-300',
          // Add 'expanded' so index.css rules can open the panel
          sidebarExpanded && 'expanded',
          // Keep the responsive columns you already had
          sidebarExpanded ? 'grid-cols-[280px_1fr]' : 'grid-cols-[56px_1fr]'
        )}
      >
        <Sidebar />

        <div className="app-content flex flex-col min-w-0">
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
