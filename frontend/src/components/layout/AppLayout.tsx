import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { Header } from '@/components/header/Header'
import { Footer } from '@/components/footer/Footer'
import { ToastContainer } from '@/components/ui/ToastContainer'

export function AppLayout() {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        
        <main className="flex-1 flex flex-col overflow-hidden">
          <Outlet />
        </main>
        
        <Footer />
      </div>
      
      <ToastContainer />
    </div>
  )
}