import { NavLink, useNavigate } from 'react-router-dom'
import { normalizeStatus } from './utils'
import './pages.css'

// Colour-coded status badge: Applied grey, Shortlisted blue, Interview purple, Offer green, Rejected red
export function StatusBadge({ status }) {
  const value = normalizeStatus(status)

  return (
    <span className={`hs-badge hs-${value.toLowerCase()}`}>{value}</span>
  )
}

// Same top bar as the other pages: logo + back to dashboard
export function PageHeader({ backLabel = '← Dashboard', backTo = '/dashboard' }) {
  const navigate = useNavigate()

  return (
    <header className="navbar">
      <a
        href="/dashboard"
        className="brand"
        onClick={event => {
          event.preventDefault()
          navigate('/dashboard')
        }}
      >
        <span className="brand-icon">H</span>
        <span>Hire<span>AI</span></span>
      </a>

      <button className="nav-button" onClick={() => navigate(backTo)}>
        {backLabel}
      </button>
    </header>
  )
}

// Recruiter sub-navigation (My Jobs / Post a Job)
export function RecruiterTabs() {
  return (
    <nav className="rc-tabs" aria-label="Recruiter pages">
      <NavLink to="/recruiter/jobs" end className="rc-tab">
        My Jobs
      </NavLink>
      <NavLink to="/recruiter/post-job" className="rc-tab">
        Post a Job
      </NavLink>
    </nav>
  )
}

export function Notice({ type = 'error', children, onClose }) {
  if (!children) return null

  return (
    <div className={`hs-notice hs-notice-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <span>{children}</span>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Close message">
          ×
        </button>
      )}
    </div>
  )
}
