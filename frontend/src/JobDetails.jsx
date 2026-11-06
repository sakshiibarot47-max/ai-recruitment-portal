import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import './App.css'
import './pages.css'
import {
  getJob,
  getSavedJobs,
  saveJob,
  removeSavedJob,
  applyToJob
} from './api'
import { skillList } from './utils'

function JobDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [file, setFile] = useState(null)
  const [applying, setApplying] = useState(false)
  const [result, setResult] = useState(null)
  const [isSaved, setIsSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')

      try {
        const data = await getJob(id)

        if (!active) return

        setJob(data)

        try {
          const saved = await getSavedJobs()

          if (active) {
            setIsSaved(
              Array.isArray(saved) &&
                saved.some(item => String(item.id) === String(id))
            )
          }
        } catch {
          // Saved state is optional on this page
        }
      } catch (err) {
        if (active) setError(err.message || 'Could not load this job.')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [id])

  async function toggleSave() {
    setSaving(true)
    setSaveError('')

    try {
      if (isSaved) {
        await removeSavedJob(id)
        setIsSaved(false)
      } else {
        await saveJob(id)
        setIsSaved(true)
      }
    } catch (err) {
      setSaveError(err.message || 'Could not update saved jobs.')
    } finally {
      setSaving(false)
    }
  }

  function chooseFile(event) {
    setFile(event.target.files?.[0] || null)
    setResult(null)
  }

  async function handleApply() {
    const fail = message => setResult({ error: message })

    if (!file) return fail('Please select your PDF resume.')

    if (
      file.type !== 'application/pdf' ||
      !file.name.toLowerCase().endsWith('.pdf')
    ) {
      return fail('Only PDF resumes are allowed.')
    }

    if (file.size > 5 * 1024 * 1024) {
      return fail('PDF file must be smaller than 5 MB.')
    }

    setApplying(true)
    setResult(null)

    try {
      const data = await applyToJob(id, file)

      setResult({ success: data })
      setFile(null)
    } catch (err) {
      fail(err.message || 'Application failed.')
    } finally {
      setApplying(false)
    }
  }

  const skills = skillList(job?.skills)

  return (
    <div className="app find-jobs-page">
      <header className="navbar">
        <a
          href="/jobs"
          className="brand"
          onClick={event => {
            event.preventDefault()
            navigate('/dashboard')
          }}
        >
          <span className="brand-icon">H</span>
          <span>Hire<span>AI</span></span>
        </a>

        <button className="nav-button" onClick={() => navigate('/jobs')}>
          ← All jobs
        </button>
      </header>

      <main className="find-jobs-container jd-container">
        {loading ? (
          <div className="find-empty">
            <div className="find-loader" />
            <h3>Loading job details...</h3>
            <p>Please wait a moment.</p>
          </div>
        ) : error ? (
          <div className="find-empty">
            <div className="find-empty-icon">⌕</div>
            <h3>Job not available</h3>
            <p>{error}</p>
            <Link className="find-search-button jd-link-button" to="/jobs">
              Browse all jobs
            </Link>
          </div>
        ) : (
          <article className="find-job-card jd-card">
            <div className="find-job-top">
              <div className="find-company-icon">
                {String(job.company || 'J').trim().charAt(0).toUpperCase()}
              </div>

              <div className="find-job-title">
                <h3>{job.title}</h3>
                <p>{job.company || 'Company not specified'}</p>
              </div>

              <span className="find-job-type">{job.type || 'Job'}</span>
            </div>

            <div className="find-job-meta">
              <span>⌖ {job.location || 'Location not specified'}</span>
              <span>✦ {job.type || 'Opportunity'}</span>
            </div>

            <div className="find-job-section">
              <h4>Required Skills</h4>
              {skills.length ? (
                <div className="jd-skills">
                  {skills.map(skill => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
              ) : (
                <p>Not specified</p>
              )}
            </div>

            <div className="find-job-section">
              <h4>About this role</h4>
              <p className="find-job-description jd-description">
                {job.description || 'No description provided.'}
              </p>
            </div>

            <div className="find-job-divider" />

            <label className="find-resume-upload">
              <span>Upload your resume</span>
              <small>PDF format · Maximum 5 MB</small>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={chooseFile}
              />
              <span className="find-file-name">
                {file ? `Selected: ${file.name}` : 'Choose PDF file'}
              </span>
            </label>

            <div className="find-job-actions">
              <button
                type="button"
                className={`find-save-button ${isSaved ? 'is-saved' : ''}`}
                disabled={saving}
                onClick={toggleSave}
              >
                {saving ? 'Please wait...' : isSaved ? '♥ Saved' : '♡ Save Job'}
              </button>

              <button
                type="button"
                className="find-apply-button"
                disabled={applying}
                onClick={handleApply}
              >
                {applying ? 'Uploading and matching...' : 'Apply Now →'}
              </button>
            </div>

            {saveError && <div className="find-result-error">{saveError}</div>}

            {result?.error && (
              <div className="find-result-error" role="alert">
                {result.error}
              </div>
            )}

            {result?.success && (
              <div className="find-match-result" role="status">
                <h4>
                  {result.success.updated
                    ? 'Resume replaced successfully!'
                    : 'Application submitted successfully!'}
                </h4>

                <div className="find-match-score">
                  <span>AI Match Score</span>
                  <strong>
                    {result.success.matchScore == null
                      ? '—'
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

                <Link className="jd-track-link" to="/my-applications">
                  Track this application →
                </Link>
              </div>
            )}
          </article>
        )}

        <footer className="find-jobs-footer">
          <span>HireAI Candidate Workspace</span>
          <span>Your next opportunity starts here.</span>
        </footer>
      </main>
    </div>
  )
}

export default JobDetails
