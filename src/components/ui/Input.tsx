import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, id, className = '', ...props }: InputProps) {
  const inputId = id ?? label
  return (
    <div className="form-field">
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
        </label>
      )}
      <input id={inputId} className={`form-input ${className}`} {...props} />
      {error && <span className="form-error">{error}</span>}
    </div>
  )
}
