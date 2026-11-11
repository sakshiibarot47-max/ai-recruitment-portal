import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { getCandidateStats, getSavedJobs, getRecruiterStats } from './api'
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

// Candidate dashboard numbers from GET /candidate/stats (hidden if the request fails)
export function CandidateStats() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let active = true

    Promise.allSettled([getCandidateStats(), getSavedJobs()]).then(([statsResult, savedResult]) => {
      if (!active || statsResult.status !== 'fulfilled') return

      // saved_jobs_count in /candidate/stats is not reliable, so count the saved list
      const savedCount =
        savedResult.status === 'fulfilled' && Array.isArray(savedResult.value)
          ? savedResult.value.length
          : statsResult.value.saved_jobs_count

      setStats({ ...statsResult.value, saved_jobs_count: savedCount })
    })

    return () => {
      active = false
    }
  }, [])

  if (!stats) return null

  const byStatus = stats.applications_by_status || {}
  const total = Object.values(byStatus).reduce((sum, count) => sum + Number(count || 0), 0)
  const advanced = Number(byStatus.Shortlisted || 0) + Number(byStatus.Interview || 0)
  const interviews = Array.isArray(stats.upcoming_interviews) ? stats.upcoming_interviews.length : 0

  const items = [
    ['Applications', total],
    ['Shortlisted / Interview', advanced],
    ['Saved jobs', Number(stats.saved_jobs_count || 0)],
    ['Upcoming interviews', interviews],
  ]

  return (
    <section className="cs-strip" aria-label="Your activity">
      {items.map(([label, value]) => (
        <div className="cs-item" key={label}>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </section>
  )
}

// Page buttons for lists (jobs feed)
export function Pagination({ page, totalPages, onChange, disabled }) {
  if (totalPages <= 1) return null

  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
  const end = Math.min(totalPages, start + 4)
  const numbers = []

  for (let number = start; number <= end; number += 1) numbers.push(number)

  return (
    <nav className="pg-nav" aria-label="Pages">
      <button
        type="button"
        className="pg-button"
        disabled={disabled || page <= 1}
        onClick={() => onChange(page - 1)}
      >
        ← Previous
      </button>

      <div className="pg-numbers">
        {numbers.map(number => (
          <button
            type="button"
            key={number}
            className={`pg-number ${number === page ? 'active' : ''}`}
            disabled={disabled}
            aria-current={number === page ? 'page' : undefined}
            onClick={() => onChange(number)}
          >
            {number}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="pg-button"
        disabled={disabled || page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next →
      </button>
    </nav>
  )
}

const ANALYTICS_STATUSES = ['Applied', 'Shortlisted', 'Interview', 'Offer', 'Rejected']

// Recruiter analytics from GET /recruiter/stats (hidden if the request fails)
export function RecruiterAnalytics() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let active = true

    getRecruiterStats()
      .then(data => {
        if (active) setStats(data)
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [])

  if (!stats) return null

  const byStatus = stats.by_status || {}
  const total = ANALYTICS_STATUSES.reduce((sum, name) => sum + Number(byStatus[name] || 0), 0)
  const average =
    stats.average_match_score === null || stats.average_match_score === undefined
      ? null
      : Math.round(Number(stats.average_match_score))

  return (
    <section className="ra-card" aria-label="Hiring analytics">
      <div className="ra-head">
        <h2>Hiring analytics</h2>

        <div className="ra-facts">
          <span>
            Average match score <b>{average === null ? '—' : `${average}%`}</b>
          </span>
          <span>
            Upcoming interviews <b>{Number(stats.upcoming_interviews || 0)}</b>
          </span>
        </div>
      </div>

      {total === 0 ? (
        <p className="ra-empty">Analytics will appear once candidates apply to your jobs.</p>
      ) : (
        <>
          <div className="ra-bar" role="img" aria-label="Applicants by status">
            {ANALYTICS_STATUSES.map(name => {
              const count = Number(byStatus[name] || 0)

              return count > 0 ? (
                <span
                  key={name}
                  className={`ra-seg hs-${name.toLowerCase()}`}
                  style={{ width: `${(count / total) * 100}%` }}
                  title={`${name}: ${count}`}
                />
              ) : null
            })}
          </div>

          <ul className="ra-legend">
            {ANALYTICS_STATUSES.map(name => (
              <li key={name}>
                <span className={`ra-dot hs-${name.toLowerCase()}`} />
                {name} <b>{Number(byStatus[name] || 0)}</b>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
