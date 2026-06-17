import type { TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export function Textarea({ label, id, className = '', ...props }: TextareaProps) {
  const textareaId = id ?? label
  return (
    <div className="form-field">
      {label && (
        <label htmlFor={textareaId} className="form-label">
          {label}
        </label>
      )}
      <textarea id={textareaId} className={`form-input form-textarea ${className}`} {...props} />
    </div>
  )
}
