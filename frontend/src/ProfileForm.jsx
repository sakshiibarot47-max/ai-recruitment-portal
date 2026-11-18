import { useEffect, useState } from 'react'
import './pages.css'
import { getMyProfile, updateMyProfile, importProfileFromResume } from './api'
import { Notice } from './components'

// [field, label, input type, max length (same as backend), placeholder]
const FIELDS = [
  ['headline', 'Headline', 'text', 150, 'e.g. Frontend Developer | React'],
  ['phone', 'Phone', 'text', 20, 'e.g. 9876543210'],
  ['location', 'Location', 'text', 100, 'e.g. Surat, Gujarat'],
  ['skills', 'Skills', 'text', 500, 'React, JavaScript, CSS (separate with commas)'],
  ['education', 'Education', 'textarea', 2000, 'Your degree, college and year'],
  ['experience', 'Experience', 'textarea', 3000, 'Internships or jobs you have done'],
  ['projects', 'Projects', 'textarea', 3000, 'Projects you have built'],
]

function ProfileForm() {
  const [form, setForm] = useState(null)
  const [completeness, setCompleteness] = useState(0)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resumeFile, setResumeFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [importDone, setImportDone] = useState('')

  useEffect(() => {
    let active = true

    getMyProfile()
      .then(data => {
        if (!active) return

        const values = {}

        FIELDS.forEach(([name]) => {
          values[name] = data[name] || ''
        })

        setForm(values)
        setCompleteness(Number(data.completeness || 0))
      })
      .catch(err => {
        if (active) setLoadError(err.message || 'Could not load your profile.')
      })

    return () => {
      active = false
    }
  }, [])

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value })
    setSuccess('')
  }

  function handleResumePick(event) {
    const file = event.target.files?.[0] || null

    setImportError('')
    setImportDone('')
    setResumeFile(null)

    if (!file) return

    if (
      file.type !== 'application/pdf' ||
      !file.name.toLowerCase().endsWith('.pdf')
    ) {
      setImportError('Please choose a PDF file.')
      event.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setImportError('The file is larger than 5 MB. Please choose a smaller PDF.')
      event.target.value = ''
      return
    }

    setResumeFile(file)
  }

  // Fills the form from the resume. Nothing is lost: the user can edit, then press "Save profile".
  async function handleImport() {
    if (!resumeFile) {
      setImportError('Please choose a PDF resume first.')
      return
    }

    setImporting(true)
    setImportError('')
    setImportDone('')

    try {
      const data = await importProfileFromResume(resumeFile)
      const extracted = data.extractedData || {}
      const filled = []
      const next = { ...form }

      FIELDS.forEach(([name, label, , max]) => {
        const value = extracted[name]

        if (typeof value === 'string' && value.trim()) {
          next[name] = value.trim().slice(0, max)
          filled.push(label.toLowerCase())
        }
      })

      setForm(next)
      setSuccess('')

      setImportDone(
        filled.length
          ? `Imported ${filled.join(' and ')} from your resume. Please check it, edit if needed, then click "Save profile".`
          : 'We could not find details in this resume. Please fill the form yourself.'
      )
    } catch (err) {
      setImportError(err.message || 'Could not read your resume.')
    } finally {
      setImporting(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const data = await updateMyProfile(form)

      if (data.profile) {
        const values = {}

        FIELDS.forEach(([name]) => {
          values[name] = data.profile[name] || ''
        })

        setForm(values)
        setCompleteness(Number(data.profile.completeness || 0))
      }

      setSuccess('Profile saved. Recommended jobs now use your skills.')
    } catch (err) {
      setError(err.message || 'Could not save your profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loadError) {
    return (
      <section className="pfm-card">
        <Notice>{loadError}</Notice>
      </section>
    )
  }

  if (!form) {
    return (
      <section className="pfm-card">
        <p className="pfm-loading">Loading your profile...</p>
      </section>
    )
  }

  return (
    <section className="pfm-card">
      <div className="pfm-head">
        <h2>Your profile</h2>
        <span>{completeness}% complete</span>
      </div>

      <div className="pfm-progress" aria-hidden="true">
        <span style={{ width: `${completeness}%` }} />
      </div>

      <div className="pfm-import">
        <div>
          <strong>Import from resume</strong>
          <p>Choose your PDF resume (max 5 MB) to fill the form. You can edit before saving.</p>
        </div>

        <div className="pfm-import-row">
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleResumePick}
            aria-label="Choose your resume (PDF)"
          />

          <button
            type="button"
            className="secondary-button"
            onClick={handleImport}
            disabled={importing || !resumeFile}
          >
            {importing ? 'Reading resume...' : 'Import from resume'}
          </button>
        </div>

        <Notice onClose={() => setImportError('')}>{importError}</Notice>
        <Notice type="success" onClose={() => setImportDone('')}>{importDone}</Notice>
      </div>

      <form className="pfm-form" onSubmit={handleSubmit}>
        {FIELDS.map(([name, label, type, max, placeholder]) => (
          <label className={`pfm-field ${type === 'textarea' ? 'wide' : ''}`} key={name}>
            <span>{label}</span>

            {type === 'textarea' ? (
              <textarea
                name={name}
                value={form[name]}
                onChange={updateField}
                maxLength={max}
                rows={4}
                placeholder={placeholder}
              />
            ) : (
              <input
                name={name}
                value={form[name]}
                onChange={updateField}
                maxLength={max}
                placeholder={placeholder}
              />
            )}
          </label>
        ))}

        <div className="pfm-actions">
          <Notice onClose={() => setError('')}>{error}</Notice>
          <Notice type="success" onClose={() => setSuccess('')}>{success}</Notice>

          <button type="submit" className="pfm-save" disabled={saving}>
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default ProfileForm
