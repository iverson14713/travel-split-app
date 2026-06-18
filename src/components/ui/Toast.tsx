import { useEffect, useState } from 'react'

interface ToastProps {
  open: boolean
  message: string
  variant?: 'success'
  duration?: number
  onClose?: () => void
}

export function Toast({ open, message, variant = 'success', duration = 2500, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false)
  const [hiding, setHiding] = useState(false)

  useEffect(() => {
    if (!open) return

    setVisible(true)
    setHiding(false)

    const hideTimer = setTimeout(() => setHiding(true), duration)
    const closeTimer = setTimeout(() => {
      setVisible(false)
      onClose?.()
    }, duration + 300)

    return () => {
      clearTimeout(hideTimer)
      clearTimeout(closeTimer)
    }
  }, [open, duration, onClose])

  if (!visible) return null

  return (
    <div className="toast-host" role="status" aria-live="polite">
      <div className={`toast toast--${variant} ${hiding ? 'toast--hide' : 'toast--show'}`}>
        {message}
      </div>
    </div>
  )
}
