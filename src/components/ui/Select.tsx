import type { SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export function Select({ label, options, id, className = '', ...props }: SelectProps) {
  const selectId = id ?? label
  return (
    <div className="form-field">
      {label && (
        <label htmlFor={selectId} className="form-label">
          {label}
        </label>
      )}
      <select id={selectId} className={`form-input form-select ${className}`} {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
