
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import './App.css'
import './pages.css'
import { JOB_TYPES } from './utils'

import {
  getJobs,
  getSavedJobs,
  saveJob,
  removeSavedJob,
  applyToJob as submitApplication
} from './api'

function JobsPage({ onBack }) {
  const [jobs, setJobs] = useState([])
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedFiles, setSelectedFiles] = useState({})
  const [results, setResults] = useState({})
  const [applying, setApplying] = useState(null)
  const [savedJobIds, setSavedJobIds] = useState([])
  const [savingJob, setSavingJob] = useState(null)
  const [savedError, setSavedError] = useState('')

  async function loadJobs(overrides = {}) {
    setLoading(true)
    setError('')

    try {
      const data = await getJobs({
        search: (overrides.search ?? search).trim(),
        location: (overrides.location ?? location).trim(),
        type: overrides.type ?? type
      })

      setJobs(Array.isArray(data) ? data : data.jobs || [])
    } catch (err) {
      setError(err.message || 'Jobs load nahi hui.')
    } finally {
      setLoading(false)
    }
  }

  async function loadSavedJobs() {
    try {
      const data = await getSavedJobs()

      setSavedJobIds(
        Array.isArray(data)
          ? data.map(job => String(job.id))
          : []
      )
    } catch (err) {
      setSavedError(err.message || 'Saved jobs load nahi hui.')
    }
  }

  // Load jobs and saved jobs once when the page opens
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    loadJobs()
    loadSavedJobs()
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  async function toggleSavedJob(jobId) {
    const id = String(jobId)
    const isSaved = savedJobIds.includes(id)

    setSavingJob(id)
    setSavedError('')

    try {
      if (isSaved) {
        await removeSavedJob(jobId)

        setSavedJobIds(previous =>
          previous.filter(item => item !== id)
        )
      } else {
        await saveJob(jobId)

        setSavedJobIds(previous =>
          previous.includes(id) ? previous : [...previous, id]
        )
      }
    } catch (err) {
      setSavedError(err.message || 'Saved job update failed.')
    } finally {
      setSavingJob(null)
    }
  }

  async function applyToJob(jobId) {
    const file = selectedFiles[jobId]

    const showResultError = message => {
      setResults(previous => ({
        ...previous,
        [jobId]: { error: message }
      }))
    }

    if (!file) {
      showResultError('Please select your PDF resume.')
      return
    }

    if (
      file.type !== 'application/pdf' ||
      !file.name.toLowerCase().endsWith('.pdf')
    ) {
      showResultError('Only PDF resumes are allowed.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showResultError('PDF file must be smaller than 5 MB.')
      return
    }

    setApplying(jobId)
    setResults(previous => ({ ...previous, [jobId]: null }))

    try {
      const data = await submitApplication(jobId, file)

      setResults(previous => ({
        ...previous,
        [jobId]: { success: data }
      }))

      setSelectedFiles(previous => ({
        ...previous,
        [jobId]: null
      }))
    } catch (err) {
      showResultError(err.message || 'Application failed.')
    } finally {
      setApplying(null)
    }
  }

  const savedCount = savedJobIds.length

  const filteredJobs = useMemo(() => jobs, [jobs])

  return (
    <div className="app find-jobs-page">
      <header className="navbar">
        <a
          href="#jobs"
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

      <main className="find-jobs-container">
        <section className="find-jobs-hero">
          <div>
            <div className="eyebrow">
              <span className="live-dot" />
              CANDIDATE WORKSPACE
            </div>

            <h1>Find your next <span>opportunity.</span></h1>
            <p>
              Discover jobs that match your skills, save your favourites
              and apply with your resume.
            </p>
          </div>

          <div className="find-jobs-hero-icon">✦</div>
        </section>

        <section className="find-jobs-summary">
          <div className="find-summary-icon">▤</div>
          <div>
            <span>Available opportunities</span>
            <strong>{loading ? '...' : jobs.length}</strong>
          </div>

          <div className="find-summary-divider" />

          <div className="find-summary-icon saved">♥</div>
          <div>
            <span>Your saved jobs</span>
            <strong>{savedCount}</strong>
          </div>
        </section>

        <form
          className="find-jobs-search has-type"
          onSubmit={event => {
            event.preventDefault()
            loadJobs()
          }}
        >
          <label>
            <span>Job title or company</span>
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="e.g. Web Developer, Google..."
            />
          </label>

          <label>
            <span>Location</span>
            <input
              value={location}
              onChange={event => setLocation(event.target.value)}
              placeholder="e.g. Surat, Mumbai..."
            />
          </label>

          <label>
            <span>Job type</span>
            <select
              value={type}
              onChange={event => {
                setType(event.target.value)
                loadJobs({ type: event.target.value })
              }}
            >
              <option value="">All types</option>
              {JOB_TYPES.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <button
            className="find-search-button"
            type="submit"
            disabled={loading}
          >
            <span>⌕</span> Search Jobs
          </button>
        </form>

        {error && <div className="find-error">{error}</div>}

        {savedError && (
          <div className="find-error" role="alert">
            {savedError}
            <button onClick={() => setSavedError('')}>×</button>
          </div>
        )}

        <div className="find-results-heading">
          <div>
            <h2>Explore Opportunities</h2>
            <p>Find a role that moves your career forward.</p>
          </div>
          <span>
            {loading ? 'Loading...' : `${filteredJobs.length} jobs found`}
          </span>
        </div>

        {loading ? (
          <div className="find-empty">
            <div className="find-loader" />
            <h3>Finding opportunities...</h3>
            <p>Please wait while we load available jobs.</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="find-empty">
            <div className="find-empty-icon">⌕</div>
            <h3>No jobs found</h3>
            <p>Try a different job title, location or job type.</p>
            <button
              className="find-search-button"
              onClick={() => {
                setSearch('')
                setLocation('')
                setType('')
                loadJobs({ search: '', location: '', type: '' })
              }}
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="find-jobs-list">
            {filteredJobs.map(job => {
              const id = String(job.id)
              const isSaved = savedJobIds.includes(id)
              const result = results[job.id]

              return (
                <article className="find-job-card" key={job.id}>
                  <div className="find-job-top">
                    <div className="find-company-icon">
                      {String(job.company || 'J').trim().charAt(0).toUpperCase()}
                    </div>

                    <div className="find-job-title">
                      <h3>{job.title}</h3>
                      <p>{job.company || 'Company not specified'}</p>
                    </div>

                    <span className="find-job-type">
                      {job.type || 'Job'}
                    </span>
                  </div>

                  <div className="find-job-meta">
                    <span>⌖ {job.location || 'Location not specified'}</span>
                    <span>✦ {job.type || 'Opportunity'}</span>
                  </div>

                  <div className="find-job-section">
                    <h4>Required Skills</h4>
                    <p>{job.skills || 'Not specified'}</p>
                  </div>

                  <div className="find-job-section">
                    <h4>About this role</h4>
                    <p className="find-job-description">
                      {job.description || 'No description provided.'}
                    </p>
                  </div>

                  <Link className="find-details-link" to={`/jobs/${job.id}`}>
                    View full details →
                  </Link>

                  <div className="find-job-divider" />

                  <label className="find-resume-upload">
                    <span>Upload your resume</span>
                    <small>PDF format · Maximum 5 MB</small>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={event => {
                        const file = event.target.files?.[0] || null

                        setSelectedFiles(previous => ({
                          ...previous,
                          [job.id]: file
                        }))

                        setResults(previous => ({
                          ...previous,
                          [job.id]: null
                        }))
                      }}
                    />
                    <span className="find-file-name">
                      {selectedFiles[job.id]
                        ? `Selected: ${selectedFiles[job.id].name}`
                        : 'Choose PDF file'}
                    </span>
                  </label>

                  <div className="find-job-actions">
                    <button
                      type="button"
                      className={`find-save-button ${isSaved ? 'is-saved' : ''}`}
                      disabled={savingJob === id}
                      onClick={() => toggleSavedJob(job.id)}
                    >
                      {savingJob === id
                        ? 'Please wait...'
                        : isSaved ? '♥ Saved' : '♡ Save Job'}
                    </button>

                    <button
                      type="button"
                      className="find-apply-button"
                      disabled={applying === job.id}
                      onClick={() => applyToJob(job.id)}
                    >
                      {applying === job.id
                        ? 'Uploading and matching...'
                        : 'Apply Now →'}
                    </button>
                  </div>

                  {result?.error && (
                    <div className="find-result-error">{result.error}</div>
                  )}

                  {result?.success && (
                    <div className="find-match-result">
                      <h4>
                        {result.success.updated
                          ? 'Resume replaced successfully!'
                          : 'Application submitted successfully!'}
                      </h4>

                      <div className="find-match-score">
                        <span>AI Match Score</span>
                        <strong>
                          {result.success.matchScore == null
                            ? 'Not available'
                            : `${result.success.matchScore}%`}
                        </strong>
                      </div>

                      <p>
                        <b>Matched skills:</b>{' '}
                        {result.success.matchedSkills?.join(', ') || 'None detected'}
                      </p>

                      <p>
                        <b>Missing skills:</b>{' '}
                        {result.success.missingSkills?.join(', ') || 'None detected'}
                      </p>

                      {result.success.note && <small>{result.success.note}</small>}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}

        <footer className="find-jobs-footer">
          <span>HireAI Candidate Workspace</span>
          <span>Your next opportunity starts here.</span>
        </footer>
      </main>
    </div>
  )
}

export default JobsPage
