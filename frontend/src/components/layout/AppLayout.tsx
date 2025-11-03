// src/components/layout/AppLayout.tsx
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { Header } from '@/components/header/Header'
import { Footer } from '@/components/footer/Footer'
import { ToastContainer } from '@/components/ui/ToastContainer'

export function AppLayout() {
  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar - Sticky on left */}
      <Sidebar />
      
      {/* Main content area - Flex column with header, content, footer */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header - Sticky at top */}
        <Header />
        
        {/* Main scrollable area - ONLY THIS SCROLLS */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
        
        {/* Footer - Sticky at bottom */}
        <Footer />
      </div>
      
      <ToastContainer />
    </div>
  )
}