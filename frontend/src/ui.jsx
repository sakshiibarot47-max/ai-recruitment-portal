import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react'

/* HireAI reusable UI: Button, Input, Card, Skeleton, Modal, Toast.
   Styles: ui.css (sab classes "ui-" se shuru hoti hain, purani CSS se takrati nahi). */

const cx = (...parts) => parts.filter(Boolean).join(' ')

export function Button({
  variant = 'primary', // primary | accent | secondary | ghost | danger
  size = 'md', // sm | md | lg
  loading = false,
  disabled = false,
  type = 'button',
  className,
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      className={cx('ui-btn', `ui-btn-${variant}`, `ui-btn-${size}`, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="ui-spinner" aria-hidden="true" />}
      {children}
    </button>
  )
}

export function Input({ label, hint, error, id, className, as = 'input', children, ...rest }) {
  const autoId = useId()
  const fieldId = id || autoId
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
  const Field = as

  return (
    <div className={cx('ui-field', error && 'ui-field-error', className)}>
      {label && (
        <label className="ui-label" htmlFor={fieldId}>
          {label}
        </label>
      )}
      <Field
        id={fieldId}
        className="ui-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      >
        {children}
      </Field>
      {error ? (
        <p className="ui-field-msg ui-field-msg-error" id={`${fieldId}-error`} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="ui-field-msg" id={`${fieldId}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function Card({ as: Tag = 'div', interactive = false, padded = true, className, children, ...rest }) {
  return (
    <Tag
      className={cx('ui-card', padded && 'ui-card-padded', interactive && 'ui-card-interactive', className)}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function Skeleton({ width = '100%', height = 16, radius = 8, className, style }) {
  return (
    <span
      className={cx('ui-skeleton', className)}
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  )
}

export function Modal({ open, title, onClose, children, footer }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const previouslyFocused = document.activeElement
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previouslyFocused?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="ui-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        className="ui-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panelRef}
      >
        <div className="ui-modal-head">
          <h2 className="ui-modal-title">{title}</h2>
          <button type="button" className="ui-modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="ui-modal-body">{children}</div>
        {footer && <div className="ui-modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

/* ---------- Toast ----------
   Use: wrap app in <ToastProvider>, phir kisi bhi component me
   const toast = useToast();  toast.success('Saved'); toast.error('Kuch galat hua') */

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setItems((list) => list.filter((item) => item.id !== id))
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
  }, [])

  const push = useCallback(
    (type, text, duration = 4500) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      setItems((list) => [...list.slice(-3), { id, type, text }])
      timers.current.set(id, setTimeout(() => dismiss(id), duration))
      return id
    },
    [dismiss],
  )

  useEffect(() => {
    const activeTimers = timers.current
    return () => activeTimers.forEach((timer) => clearTimeout(timer))
  }, [])

  const api = useMemo(
    () => ({
      success: (text, d) => push('success', text, d),
      error: (text, d) => push('error', text, d),
      info: (text, d) => push('info', text, d),
      dismiss,
    }),
    [push, dismiss],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="ui-toast-region" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={cx('ui-toast', `ui-toast-${item.type}`)} role="status">
            <span>{item.text}</span>
            <button type="button" onClick={() => dismiss(item.id)} aria-label="Dismiss">
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast ko <ToastProvider> ke andar use karo')
  return ctx
}
