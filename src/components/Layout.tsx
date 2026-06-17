import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface LayoutProps {
  children: ReactNode
  showBack?: boolean
  backTo?: string
}

export function Layout({ children, showBack = false, backTo = '/' }: LayoutProps) {
  return (
    <div className="layout">
      {showBack && (
        <header className="layout-header">
          <Link to={backTo} className="back-link">
            ← 返回
          </Link>
        </header>
      )}
      <main className="layout-main">{children}</main>
    </div>
  )
}
