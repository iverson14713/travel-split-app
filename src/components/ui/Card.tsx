import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div className={`card ${className}`} onClick={onClick} role={onClick ? 'button' : undefined}>
      {children}
    </div>
  )
}
