import { useState } from 'react'
import { Link } from 'react-router-dom'
import './App.css'
import './pages.css'
import { createJob } from './api'
import { PageHeader, RecruiterTabs } from './components'
import { JOB_TYPES } from './utils'

const emptyForm = {
  title: '',
  company: '',
  location: '',
  job_type: JOB_TYPES[0],
  skills: '',
  description: '',
}

function PostJob() {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [postedJobId, setPostedJobId] = useState(null)

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setIsError(false)
    setPostedJobId(null)

    const skills = form.skills
      .split(',')
      .map(skill => skill.trim())
      .filter(Boolean)

    if (!form.title.trim() || !form.company.trim() || !form.location.trim()) {
      setMessage('Please fill job title, company and location.')
      setIsError(true)
      return
    }

    if (skills.length === 0) {
      setMessage('Add at least one required skill (separate skills with commas).')
      setIsError(true)
      return
    }

    if (form.description.trim().length < 10) {
      setMessage('Please write a job description (at least 10 characters).')
      setIsError(true)
      return
    }

    setSaving(true)

    try {
      const data = await createJob({
        title: form.title.trim(),
        company: form.company.trim(),
        location: form.location.trim(),
        type: form.job_type,
        skills: skills.join(', '),
        description: form.description.trim(),
      })

      setMessage('Job posted successfully!')
      setPostedJobId(data?.jobId ?? null)
      setForm(emptyForm)
    } catch (err) {
      setMessage(err.message || 'Could not post the job. Please try again.')
      setIsError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="app manage-jobs-page">
      <PageHeader />

      <main className="manage-jobs-content rc-page">
        <div className="eyebrow">
          <span className="live-dot" />
          RECRUITER WORKSPACE
        </div>

        <h1>Post a job</h1>
        <p className="manage-jobs-intro">
          Publish an opportunity and start receiving applications.
        </p>

        <RecruiterTabs />

        <section className="auth-card manage-jobs-form-card">
          <h2>Job details</h2>
          <p className="auth-subtitle">Fields marked * are required.</p>

          <form className="auth-form manage-jobs-form" onSubmit={handleSubmit} noValidate>
            <label className="form-field">
              <span>Job title *</span>
              <input
                name="title"
                value={form.title}
                onChange={updateField}
                placeholder="e.g. Frontend Developer"
                maxLength={120}
                required
              />
            </label>

            <label className="form-field">
              <span>Company *</span>
              <input
                name="company"
                value={form.company}
                onChange={updateField}
                placeholder="Company name"
                maxLength={120}
                required
              />
            </label>

            <div className="manage-jobs-two-col">
              <label className="form-field">
                <span>Location *</span>
                <input
                  name="location"
                  value={form.location}
                  onChange={updateField}
                  placeholder="e.g. Surat, Gujarat"
                  maxLength={120}
                  required
                />
              </label>

              <label className="form-field">
                <span>Job type</span>
                <select
                  name="job_type"
                  value={form.job_type}
                  onChange={updateField}
                >
                  {JOB_TYPES.map(type => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="form-field">
              <span>Required skills *</span>
              <input
                name="skills"
                value={form.skills}
                onChange={updateField}
                placeholder="React, JavaScript, HTML, CSS"
                required
              />
              <small className="field-hint">
                Separate skills with commas. Candidates are matched against these.
              </small>
            </label>

            <label className="form-field">
              <span>Job description *</span>
              <textarea
                name="description"
                value={form.description}
                onChange={updateField}
                rows={6}
                placeholder="Describe responsibilities and requirements..."
                required
              />
            </label>

            {message && (
              <div
                className={`form-message ${isError ? '' : 'success-message'}`}
                role={isError ? 'alert' : 'status'}
              >
                {message}
                {!isError && (
                  <>
                    {' '}
                    <Link className="rc-inline-link" to="/recruiter/jobs">
                      View my jobs →
                    </Link>
                    {postedJobId && (
                      <>
                        {' · '}
                        <Link
                          className="rc-inline-link"
                          to={`/recruiter/jobs/${postedJobId}/applicants`}
                        >
                          Applicants
                        </Link>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            <button
              className="primary-button form-button"
              type="submit"
              disabled={saving}
            >
              {saving ? 'Publishing...' : 'Publish job →'}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}

export default PostJob
