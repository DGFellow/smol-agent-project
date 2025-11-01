import React from 'react'
import SidebarRail from './SidebarRail'
import SidebarPanel from './SidebarPanel'

const Sidebar: React.FC = () => {
  return (
    <aside className="h-full flex">
      <SidebarRail />
      <SidebarPanel />
    </aside>
  )
}

export default Sidebar
export { Sidebar }
