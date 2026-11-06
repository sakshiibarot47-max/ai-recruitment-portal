
import { useEffect, useMemo, useState } from 'react'
import './App.css'
import './pages.css'
import { normalizeStatus, scoreValue, formatDate } from './utils'

import {
  myApplications,
  withdrawApplication as deleteApplication
} from './api'

const FILTERS = [
  'All',
  'Applied',
  'Shortlisted',
  'Interview',
  'Offer',
  'Rejected'
]

const getStatus = normalizeStatus

const PROGRESS = {
  Applied: 25,
  Shortlisted: 50,
  Interview: 75,
  Offer: 100,
  Rejected: 100,
  Withdrawn: 100
}

function ApplicationsPage({ onBack }) {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [withdrawingId, setWithdrawingId] = useState(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    loadApplications()
  }, [])

  async function loadApplications() {
    setLoading(true)
    setError('')

    try {
      const data = await myApplications()
      setApplications(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Unable to load applications.')
    } finally {
      setLoading(false)
    }
  }

  async function withdrawApplication(application) {
    const confirmed = window.confirm(
      `Are you sure you want to withdraw your application for "${application.title}"?`
    )

    if (!confirmed) return

    setWithdrawingId(application.id)
    setError('')
    setNotice('')

    try {
      await deleteApplication(application.id)

      setApplications(previous =>
        previous.map(item =>
          String(item.id) === String(application.id)
            ? { ...item, status: 'Withdrawn' }
            : item
        )
      )

      setNotice('Application withdrawn successfully.')
    } catch (err) {
      setError(err.message || 'Unable to withdraw application.')
    } finally {
      setWithdrawingId(null)
    }
  }

  const stats = useMemo(() => {
    return {
      total: applications.length,
      applied: applications.filter(
        app => getStatus(app.status) === 'Applied'
      ).length,
      shortlisted: applications.filter(
        app => getStatus(app.status) === 'Shortlisted'
      ).length,
      advanced: applications.filter(app =>
        ['Interview', 'Offer'].includes(getStatus(app.status))
      ).length
    }
  }, [applications])

  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const title = String(app.title || '').toLowerCase()
      const company = String(app.company || '').toLowerCase()
      const query = search.trim().toLowerCase()

      const matchesSearch =
        title.includes(query) || company.includes(query)

      const matchesFilter =
        activeFilter === 'All' ||
        getStatus(app.status) === activeFilter

      return matchesSearch && matchesFilter
    })
  }, [applications, search, activeFilter])

  return (
    <div className="app applications-page">
      <header className="navbar">
        <a
          href="#applications"
          className="brand"
          onClick={event => {
            event.preventDefault()
            onBack()
          }}
        >
          <span className="brand-icon">H</span>
          <span>Hire<span>AI</span></span>
        </a>

        <button className="nav-button" onClick={onBack}>
          ← Dashboard
        </button>
      </header>

      <main className="applications-container">
        <div className="applications-heading">
          <div>
            <div className="eyebrow">
              <span className="live-dot" />
              CANDIDATE WORKSPACE
            </div>

            <h1>My Applications</h1>

            <p>
              Track your job applications and stay updated on your hiring journey.
            </p>
          </div>

          <button
            className="applications-refresh"
            onClick={loadApplications}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </div>

        {error && (
          <div className="applications-alert applications-error" role="alert">
            <span>⚠</span>
            {error}
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        {notice && (
          <div className="applications-alert applications-success" role="status">
            <span>✓</span>
            {notice}
            <button onClick={() => setNotice('')}>×</button>
          </div>
        )}

        <section className="application-stats">
          <div className="application-stat">
            <span className="stat-icon stat-blue">▤</span>
            <div>
              <span>Total Applications</span>
              <strong>{stats.total}</strong>
            </div>
          </div>

          <div className="application-stat">
            <span className="stat-icon stat-orange">◷</span>
            <div>
              <span>Applied</span>
              <strong>{stats.applied}</strong>
            </div>
          </div>

          <div className="application-stat">
            <span className="stat-icon stat-purple">◉</span>
            <div>
              <span>Shortlisted</span>
              <strong>{stats.shortlisted}</strong>
            </div>
          </div>

          <div className="application-stat">
            <span className="stat-icon stat-green">✓</span>
            <div>
              <span>Interview / Offer</span>
              <strong>{stats.advanced}</strong>
            </div>
          </div>
        </section>

        <section className="applications-panel">
          <div className="applications-toolbar">
            <div>
              <h2>Application History</h2>
              <p>All your submitted job applications.</p>
            </div>

            <div className="applications-search">
              <span>⌕</span>
              <input
                type="search"
                placeholder="Search jobs or companies..."
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
            </div>
          </div>

          <div className="application-filters">
            {FILTERS.map(filter => (
              <button
                key={filter}
                className={
                  activeFilter === filter
                    ? 'application-filter active'
                    : 'application-filter'
                }
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="applications-empty">
              <div className="applications-loader" />
              <h3>Loading applications...</h3>
              <p>Please wait while we fetch your applications.</p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="applications-empty">
              <div className="applications-empty-icon">▤</div>

              <h3>
                {applications.length === 0
                  ? 'No applications yet'
                  : 'No matching applications'}
              </h3>

              <p>
                {applications.length === 0
                  ? 'Your submitted job applications will appear here.'
                  : 'Try changing your search or selecting another status filter.'}
              </p>

              {applications.length === 0 && (
                <button className="primary-button" onClick={onBack}>
                  Explore Jobs →
                </button>
              )}

              {(search || activeFilter !== 'All') && (
                <button
                  className="applications-clear"
                  onClick={() => {
                    setSearch('')
                    setActiveFilter('All')
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="applications-list">
              {filteredApplications.map(application => {
                const status = getStatus(application.status)
                const canWithdraw = status === 'Applied'
                const score = scoreValue(application.match_score)

                return (
                  <article
                    className="application-item"
                    key={application.id}
                  >
                    <div className="application-company-icon">
                      {String(application.company || 'J')
                        .trim()
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="application-main">
                      <div className="application-title-row">
                        <div>
                          <h3>
                            {application.title || 'Untitled Position'}
                          </h3>

                          <p className="application-company">
                            {application.company || 'Company not specified'}
                          </p>
                        </div>

                        <span
                          className={`application-status hs-${status.toLowerCase()}`}
                        >
                          {status}
                        </span>
                      </div>

                      <div className="application-meta">
                        <span>
                          <strong>Applied:</strong>{' '}
                          {formatDate(application.applied_at)}
                        </span>

                        <span className="application-match">
                          ✳ AI Match: {score === null ? '—' : `${score}%`}
                        </span>
                      </div>

                      <div className="application-progress">
                        <span
                          style={{
                            width: `${PROGRESS[status] || 25}%`
                          }}
                        />
                      </div>

                      <div className="application-actions">
                        {canWithdraw ? (
                          <button
                            className="withdraw-button"
                            onClick={() => withdrawApplication(application)}
                            disabled={withdrawingId === application.id}
                          >
                            {withdrawingId === application.id
                              ? 'Withdrawing...'
                              : 'Withdraw Application'}
                          </button>
                        ) : (
                          <span className="application-note">
                            {status === 'Withdrawn'
                              ? 'You withdrew this application.'
                              : status === 'Offer'
                                ? 'Congratulations! The recruiter has made you an offer.'
                                : status === 'Interview'
                                  ? 'You are at the interview stage. The recruiter will contact you.'
                                  : 'Contact the recruiter for further updates.'}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <footer className="applications-footer">
          <span>HireAI Candidate Workspace</span>
          <span>Stay prepared. Your next opportunity awaits.</span>
        </footer>
      </main>
    </div>
  )
}

export default ApplicationsPage
