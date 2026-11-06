import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import './App.css'
import './pages.css'
import { getJobs, getApplicants, getUser } from './api'
import { PageHeader, RecruiterTabs, Notice } from './components'
import { JOB_TYPES, normalizeStatus, skillList } from './utils'

function MyJobs() {
  const user = getUser()

  const [jobs, setJobs] = useState([])
  const [applicantsByJob, setApplicantsByJob] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')

  const fetchMyJobs = useCallback(async () => {
    const data = await getJobs()
    const list = Array.isArray(data) ? data : data.jobs || []

    // Only this recruiter's own jobs
    const mine = list.filter(
      job => String(job.recruiter_id) === String(user?.id)
    )

    const results = await Promise.allSettled(
      mine.map(job => getApplicants(job.id))
    )

    const counts = {}

    mine.forEach((job, index) => {
      const result = results[index]

      counts[job.id] =
        result.status === 'fulfilled' && Array.isArray(result.value)
          ? result.value
          : null
    })

    return { mine, counts }
  }, [user?.id])

  useEffect(() => {
    let active = true

    fetchMyJobs()
      .then(({ mine, counts }) => {
        if (!active) return

        setJobs(mine)
        setApplicantsByJob(counts)
      })
      .catch(err => {
        if (active) setError(err.message || 'Could not load your jobs.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [fetchMyJobs])

  async function loadJobs() {
    setLoading(true)
    setError('')

    try {
      const { mine, counts } = await fetchMyJobs()

      setJobs(mine)
      setApplicantsByJob(counts)
    } catch (err) {
      setError(err.message || 'Could not load your jobs.')
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const all = Object.values(applicantsByJob).filter(Array.isArray).flat()

    const countStatus = names =>
      all.filter(item => names.includes(normalizeStatus(item.status))).length

    return {
      jobs: jobs.length,
      applicants: all.length,
      shortlisted: countStatus(['Shortlisted']),
      advanced: countStatus(['Interview', 'Offer']),
    }
  }, [jobs, applicantsByJob])

  const visibleJobs = useMemo(() => {
    const query = search.trim().toLowerCase()

    return jobs.filter(job => {
      const text = `${job.title} ${job.company} ${job.location} ${job.skills}`.toLowerCase()

      return (
        text.includes(query) &&
        (typeFilter === 'All' || job.type === typeFilter)
      )
    })
  }, [jobs, search, typeFilter])

  return (
    <div className="app manage-jobs-page">
      <PageHeader />

      <main className="manage-jobs-content rc-page rc-wide">
        <div className="eyebrow">
          <span className="live-dot" />
          RECRUITER WORKSPACE
        </div>

        <h1>My jobs</h1>
        <p className="manage-jobs-intro">
          Track your openings and review the candidates who applied.
        </p>

        <RecruiterTabs />

        <section className="rc-stats" aria-label="Hiring summary">
          <div className="rc-stat">
            <span className="rc-stat-icon rc-blue">▤</span>
            <div>
              <span>Total jobs</span>
              <strong>{loading ? '…' : stats.jobs}</strong>
            </div>
          </div>

          <div className="rc-stat">
            <span className="rc-stat-icon rc-orange">♙</span>
            <div>
              <span>Total applicants</span>
              <strong>{loading ? '…' : stats.applicants}</strong>
            </div>
          </div>

          <div className="rc-stat">
            <span className="rc-stat-icon rc-purple">◉</span>
            <div>
              <span>Shortlisted</span>
              <strong>{loading ? '…' : stats.shortlisted}</strong>
            </div>
          </div>

          <div className="rc-stat">
            <span className="rc-stat-icon rc-green">✓</span>
            <div>
              <span>Interview / Offer</span>
              <strong>{loading ? '…' : stats.advanced}</strong>
            </div>
          </div>
        </section>

        <div className="rc-toolbar">
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search your jobs by title, company or skill..."
            aria-label="Search your jobs"
          />

          <select
            value={typeFilter}
            onChange={event => setTypeFilter(event.target.value)}
            aria-label="Filter by job type"
          >
            <option>All</option>
            {JOB_TYPES.map(type => (
              <option key={type}>{type}</option>
            ))}
          </select>

          <button
            type="button"
            className="secondary-button"
            onClick={loadJobs}
            disabled={loading}
          >
            {loading ? 'Loading...' : '↻ Refresh'}
          </button>
        </div>

        <Notice onClose={() => setError('')}>{error}</Notice>

        {loading ? (
          <div className="rc-empty">
            <div className="rc-loader" />
            <h3>Loading your jobs...</h3>
            <p>Please wait a moment.</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="rc-empty">
            <h3>You have not posted any jobs yet</h3>
            <p>Post your first job to start receiving applications.</p>
            <Link className="primary-button" to="/recruiter/post-job">
              Post a job →
            </Link>
          </div>
        ) : visibleJobs.length === 0 ? (
          <div className="rc-empty">
            <h3>No jobs match your search</h3>
            <p>Try a different keyword or job type.</p>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setSearch('')
                setTypeFilter('All')
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="rc-job-list">
            {visibleJobs.map(job => {
              const applicants = applicantsByJob[job.id]
              const count = Array.isArray(applicants) ? applicants.length : null

              return (
                <article className="rc-job-card" key={job.id}>
                  <div className="rc-job-main">
                    <div className="rc-job-head">
                      <span className="job-type">{job.type || 'Job'}</span>
                      <h3>{job.title}</h3>
                    </div>

                    <p className="rc-job-meta">
                      {job.company} · {job.location || 'Location not specified'}
                    </p>

                    <p className="rc-job-desc">{job.description}</p>

                    <div className="rc-chips">
                      {skillList(job.skills).map(skill => (
                        <span className="rc-chip" key={skill}>{skill}</span>
                      ))}
                    </div>
                  </div>

                  <div className="rc-job-side">
                    <div className="rc-count">
                      <strong>{count === null ? '—' : count}</strong>
                      <span>{count === 1 ? 'applicant' : 'applicants'}</span>
                    </div>

                    <Link
                      className="primary-button"
                      to={`/recruiter/jobs/${job.id}/applicants`}
                    >
                      View applicants →
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export default MyJobs
