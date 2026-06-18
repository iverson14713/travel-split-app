import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { APP_NAME, LEGAL_LAST_UPDATED } from '../../constants/app'

interface LegalDocumentLayoutProps {
  title: string
  children: ReactNode
}

export function LegalDocumentLayout({ title, children }: LegalDocumentLayoutProps) {
  return (
    <div className="legal-page">
      <header className="legal-header">
        <Link to="/" className="legal-back">
          ← 返回首頁
        </Link>
        <p className="legal-app-name">{APP_NAME}</p>
      </header>
      <main className="legal-main">
        <article className="legal-card">
          <h1 className="legal-title">{title}</h1>
          <div className="legal-content">{children}</div>
          <p className="legal-footer">最後更新日期：{LEGAL_LAST_UPDATED}</p>
        </article>
      </main>
    </div>
  )
}
