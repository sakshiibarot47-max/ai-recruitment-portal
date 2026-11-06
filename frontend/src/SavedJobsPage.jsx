
import { useEffect, useMemo, useState } from 'react'
import './App.css'

import {
  getSavedJobs,
  removeSavedJob as deleteSavedJob
} from './api'

function SavedJobsPage({ onBack }) {
  const [savedJobs, setSavedJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [removingId, setRemovingId] = useState(null)

  useEffect(() => {
    loadSavedJobs()
  }, [])

  async function loadSavedJobs() {
    setLoading(true)
    setError('')

    try {
      const data = await getSavedJobs()
      setSavedJobs(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Could not load saved jobs.')
    } finally {
      setLoading(false)
    }
  }

  async function removeSavedJob(jobId) {
    setRemovingId(jobId)
    setError('')

    try {
      await deleteSavedJob(jobId)

      setSavedJobs(previous =>
        previous.filter(job => String(job.id) !== String(jobId))
      )
    } catch (err) {
      setError(err.message || 'Remove failed.')
    } finally {
      setRemovingId(null)
    }
  }

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase()

    return savedJobs.filter(job =>
      String(job.title || '').toLowerCase().includes(query) ||
      String(job.company || '').toLowerCase().includes(query)
    )
  }, [savedJobs, search])

  return (
    <div className="app saved-jobs-page">
      <header className="navbar">
        <a
          href="#saved-jobs"
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

      <main className="saved-jobs-container">
        <div className="saved-jobs-heading">
          <div>
            <div className="eyebrow">
              <span className="live-dot" />
              CANDIDATE WORKSPACE
            </div>

            <h1>Saved Jobs</h1>
            <p>Keep your favourite opportunities close at hand.</p>
          </div>

          <button
            className="saved-refresh"
            onClick={loadSavedJobs}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </div>

        <section className="saved-summary">
          <div className="saved-summary-icon">♥</div>
          <div>
            <span>Total Saved Jobs</span>
            <strong>{savedJobs.length}</strong>
          </div>
          <p>Your shortlisted career opportunities in one place.</p>
        </section>

        {error && (
          <div className="saved-error" role="alert">
            {error}
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        <section className="saved-panel">
          <div className="saved-toolbar">
            <div>
              <h2>Your Saved Opportunities</h2>
              <p>Review the jobs you have bookmarked.</p>
            </div>

            <input
              type="search"
              placeholder="Search jobs or companies..."
              value={search}
              onChange={event => setSearch(event.target.value)}
              aria-label="Search saved jobs"
            />
          </div>

          {loading ? (
            <div className="saved-empty">
              <div className="saved-loader" />
              <h3>Loading saved jobs...</h3>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="saved-empty">
              <div className="saved-empty-icon">♡</div>

              <h3>
                {savedJobs.length === 0
                  ? 'No saved jobs yet'
                  : 'No matching jobs found'}
              </h3>

              <p>
                {savedJobs.length === 0
                  ? 'Save interesting jobs from Find Jobs and they will appear here.'
                  : 'Try another job title or company name.'}
              </p>

              <button className="saved-explore" onClick={onBack}>
                Back to Dashboard →
              </button>
            </div>
          ) : (
            <div className="saved-list">
              {filteredJobs.map(job => (
                <article className="saved-job-card" key={job.id}>
                  <div className="saved-company-icon">
                    {String(job.company || 'J').trim().charAt(0).toUpperCase()}
                  </div>

                  <div className="saved-job-info">
                    <h3>{job.title || 'Untitled Position'}</h3>
                    <p className="saved-company">
                      {job.company || 'Company not specified'}
                    </p>
                    <p className="saved-location">
                      <span>⌖</span>
                      {job.location || 'Location not specified'}
                    </p>

                    {job.description && (
                      <p className="saved-description">
                        {job.description}
                      </p>
                    )}
                  </div>

                  <button
                    className="saved-remove"
                    onClick={() => removeSavedJob(job.id)}
                    disabled={removingId === job.id}
                  >
                    {removingId === job.id ? 'Removing...' : '♥ Remove'}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="saved-footer">
          <span>HireAI Candidate Workspace</span>
          <span>Discover opportunities. Build your future.</span>
        </footer>
      </main>
    </div>
  )
}

export default SavedJobsPage
