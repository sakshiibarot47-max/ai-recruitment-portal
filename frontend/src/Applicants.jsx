import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import './App.css'
import './pages.css'
import { getJob, getApplicants, updateStatus, openResume } from './api'
import { PageHeader, RecruiterTabs, Notice } from './components'
import { STATUSES, formatDate, normalizeStatus, scoreValue } from './utils'

function Applicants() {
  const { id: jobId } = useParams()

  const [job, setJob] = useState(null)
  const [applicants, setApplicants] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [minScore, setMinScore] = useState(0)
  const [sortBy, setSortBy] = useState('score')
  const [updatingId, setUpdatingId] = useState(null)
  const [openingId, setOpeningId] = useState(null)

  const fetchAll = useCallback(async () => {
    const [jobData, applicantData] = await Promise.all([
      getJob(jobId),
      getApplicants(jobId),
    ])

    return {
      jobData,
      applicantData: Array.isArray(applicantData) ? applicantData : [],
    }
  }, [jobId])

  useEffect(() => {
    let active = true

    fetchAll()
      .then(({ jobData, applicantData }) => {
        if (!active) return

        setJob(jobData)
        setApplicants(applicantData)
      })
      .catch(err => {
        if (active) setLoadError(err.message || 'Could not load applicants.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [fetchAll])

  async function load() {
    setLoading(true)
    setLoadError('')

    try {
      const { jobData, applicantData } = await fetchAll()

      setJob(jobData)
      setApplicants(applicantData)
    } catch (err) {
      setLoadError(err.message || 'Could not load applicants.')
    } finally {
      setLoading(false)
    }
  }

  async function changeStatus(applicant, nextStatus) {
    const current = normalizeStatus(applicant.status)

    if (nextStatus === current) return

    if (
      nextStatus === 'Rejected' &&
      !window.confirm(`Reject ${applicant.name || 'this candidate'}?`)
    ) {
      return
    }

    setUpdatingId(applicant.application_id)
    setError('')
    setNotice('')

    try {
      await updateStatus(applicant.application_id, nextStatus)

      setApplicants(previous =>
        previous.map(item =>
          item.application_id === applicant.application_id
            ? { ...item, status: nextStatus }
            : item
        )
      )

      setNotice(`${applicant.name || 'Candidate'} moved to ${nextStatus}.`)
    } catch (err) {
      setError(err.message || 'Could not update the status.')
    } finally {
      setUpdatingId(null)
    }
  }

  async function viewResume(applicant) {
    setOpeningId(applicant.application_id)
    setError('')

    try {
      await openResume(applicant.application_id)
    } catch (err) {
      setError(err.message || 'Could not open the resume.')
    } finally {
      setOpeningId(null)
    }
  }

  const counts = useMemo(() => {
    const result = { All: applicants.length }

    STATUSES.forEach(status => {
      result[status] = applicants.filter(
        item => normalizeStatus(item.status) === status
      ).length
    })

    return result
  }, [applicants])

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()

    const list = applicants.filter(item => {
      const text = `${item.name || ''} ${item.email || ''}`.toLowerCase()
      const score = scoreValue(item.match_score)

      return (
        text.includes(query) &&
        (statusFilter === 'All' || normalizeStatus(item.status) === statusFilter) &&
        (minScore === 0 || (score !== null && score >= minScore))
      )
    })

    return list.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.applied_at || 0) - new Date(a.applied_at || 0)
      }

      return (scoreValue(b.match_score) ?? -1) - (scoreValue(a.match_score) ?? -1)
    })
  }, [applicants, search, statusFilter, minScore, sortBy])

  const filtersActive = search || statusFilter !== 'All' || minScore !== 0

  return (
    <div className="app manage-jobs-page">
      <PageHeader backLabel="← My Jobs" backTo="/recruiter/jobs" />

      <main className="manage-jobs-content rc-page rc-wide">
        <div className="eyebrow">
          <span className="live-dot" />
          RECRUITER WORKSPACE
        </div>

        <h1>Applicants</h1>
        <p className="manage-jobs-intro">
          {job
            ? `${job.title} · ${job.company}`
            : 'Review candidates and move them through your hiring pipeline.'}
        </p>

        <RecruiterTabs />

        {loadError ? (
          <div className="rc-empty">
            <h3>Could not open this job</h3>
            <p>{loadError}</p>
            <div className="rc-empty-actions">
              <button type="button" className="secondary-button" onClick={load}>
                Try again
              </button>
              <Link className="primary-button" to="/recruiter/jobs">
                Back to my jobs
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="rc-status-tabs" role="tablist" aria-label="Filter by status">
              {['All', ...STATUSES].map(status => (
                <button
                  type="button"
                  key={status}
                  className={`rc-status-tab ${statusFilter === status ? 'active' : ''}`}
                  onClick={() => setStatusFilter(status)}
                >
                  {status} <b>{counts[status]}</b>
                </button>
              ))}
            </div>

            <div className="rc-toolbar rc-toolbar-applicants">
              <input
                type="search"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search by candidate name or email..."
                aria-label="Search applicants"
              />

              <select
                value={minScore}
                onChange={event => setMinScore(Number(event.target.value))}
                aria-label="Minimum match score"
              >
                <option value={0}>Any match score</option>
                <option value={50}>50% and above</option>
                <option value={70}>70% and above</option>
                <option value={90}>90% and above</option>
              </select>

              <select
                value={sortBy}
                onChange={event => setSortBy(event.target.value)}
                aria-label="Sort applicants"
              >
                <option value="score">Best match first</option>
                <option value="newest">Newest first</option>
              </select>
            </div>

            <Notice onClose={() => setError('')}>{error}</Notice>
            <Notice type="success" onClose={() => setNotice('')}>{notice}</Notice>

            {loading ? (
              <div className="rc-empty">
                <div className="rc-loader" />
                <h3>Loading applicants...</h3>
                <p>Please wait a moment.</p>
              </div>
            ) : applicants.length === 0 ? (
              <div className="rc-empty">
                <h3>No applicants yet</h3>
                <p>Candidates who apply to this job will appear here.</p>
              </div>
            ) : visible.length === 0 ? (
              <div className="rc-empty">
                <h3>No applicants match your filters</h3>
                <p>Try changing the search, status or match score.</p>
                {filtersActive && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setSearch('')
                      setStatusFilter('All')
                      setMinScore(0)
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="rc-table-wrap">
                <table className="rc-table">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Match score</th>
                      <th>Status</th>
                      <th>Applied</th>
                      <th>Resume</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visible.map(applicant => {
                      const score = scoreValue(applicant.match_score)
                      const status = normalizeStatus(applicant.status)
                      const busy = updatingId === applicant.application_id

                      return (
                        <tr key={applicant.application_id}>
                          <td data-label="Candidate">
                            <strong className="rc-name">
                              {applicant.name || 'Candidate'}
                            </strong>
                            <span className="rc-email">{applicant.email}</span>
                          </td>

                          <td data-label="Match score">
                            {score === null ? (
                              <span className="rc-muted" title="Resume could not be read">
                                —
                              </span>
                            ) : (
                              <div className="rc-score">
                                <div className="rc-score-bar">
                                  <span style={{ width: `${Math.min(score, 100)}%` }} />
                                </div>
                                <b>{score}%</b>
                              </div>
                            )}
                          </td>

                          <td data-label="Status">
                            <select
                              className={`rc-status-select hs-${status.toLowerCase()}`}
                              value={status}
                              disabled={busy}
                              onChange={event =>
                                changeStatus(applicant, event.target.value)
                              }
                              aria-label={`Status for ${applicant.name || 'candidate'}`}
                            >
                              {STATUSES.map(item => (
                                <option key={item}>{item}</option>
                              ))}
                            </select>
                          </td>

                          <td data-label="Applied">
                            {formatDate(applicant.applied_at)}
                          </td>

                          <td data-label="Resume">
                            <button
                              type="button"
                              className="secondary-button rc-resume-button"
                              disabled={
                                !applicant.resume_path ||
                                openingId === applicant.application_id
                              }
                              onClick={() => viewResume(applicant)}
                            >
                              {openingId === applicant.application_id
                                ? 'Opening...'
                                : 'View resume'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default Applicants
