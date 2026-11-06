
import {
  getCandidateResume,
  saveCandidateResume
} from './api'

import { useEffect, useMemo, useState } from 'react'
import './App.css'

const emptyEducation = {
  degree: '', institution: '', field: '', startYear: '', endYear: '', grade: ''
}

const emptyExperience = {
  title: '', company: '', location: '', startDate: '', endDate: '',
  current: false, responsibilities: ''
}

const emptyProject = {
  name: '', technologies: '', description: '', link: ''
}

const initialForm = {
  name: '', title: '', email: '', phone: '', city: '', summary: '',
  linkedin: '', github: '', portfolio: '', skills: '', languages: '',
  certifications: '', achievements: '', hobbies: '',
  education: [{ ...emptyEducation }],
  experience: [],
  projects: []
}

const templates = [
  { id: 'modern', name: 'Modern Professional', description: 'Clean navy and white design' },
  { id: 'corporate', name: 'Corporate', description: 'Structured two-column design' },
  { id: 'ats', name: 'ATS Friendly', description: 'Simple, readable single-column design' },
  { id: 'creative', name: 'Creative', description: 'Modern design with blue accents' }
]

const acronyms = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  html: 'HTML',
  css: 'CSS',
  sql: 'SQL',
  api: 'API',
  ui: 'UI',
  ux: 'UX',
  ai: 'AI',
  seo: 'SEO',
  react: 'React',
  'node.js': 'Node.js',
  nodejs: 'Node.js',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  mongodb: 'MongoDB',
  mysql: 'MySQL',
  php: 'PHP',
  python: 'Python',
  java: 'Java',
  aws: 'AWS',
  iot: 'IoT',
  bca: 'BCA',
  mca: 'MCA',
  bba: 'BBA',
  mba: 'MBA',
  btech: 'B.Tech',
  mtech: 'M.Tech'
}

function professionalCase(value = '') {
  return value
    .split(/(\s+)/)
    .map(part => {
      if (!part.trim()) return part

      return part.split(/([-_/])/).map(piece => {
        if (!piece || /^[-_/]$/.test(piece)) return piece

        const key = piece.toLowerCase()
        if (acronyms[key]) return acronyms[key]

        return piece.charAt(0).toUpperCase() + piece.slice(1).toLowerCase()
      }).join('')
    })
    .join('')
}

function professionalSentence(value = '') {
  return value
    .toLowerCase()
    .replace(/(^\s*[a-z]|[.!?]\s+[a-z])/g, letter => letter.toUpperCase())
    .replace(/\b(html|css|javascript|typescript|sql|api|ai|ui|ux|react|node\.js|github|mongodb|mysql|python|php|aws)\b/gi,
      word => acronyms[word.toLowerCase()] || word)
}

function Field({ label, required, error, children }) {
  return (
    <label className="rb-field">
      <span>{label} {required && <b className="rb-required">*</b>}</span>
      {children}
      {error && <small className="rb-error">{error}</small>}
    </label>
  )
}

function ResumePreview({ form, template, skills }) {
  return (
    <article className={`rb-paper rb-${template}`}>
      <header className="rb-resume-header">
        <h1>{professionalCase(form.name)}</h1>
        <h2>{professionalCase(form.title)}</h2>
        <p>{[form.email, form.phone, professionalCase(form.city)].filter(Boolean).join('  |  ')}</p>
        <p>{[form.linkedin, form.github, form.portfolio].filter(Boolean).join('  |  ')}</p>
      </header>

      {form.summary.trim() && (
        <section className="rb-resume-section">
          <h3>Professional Summary</h3>
          <p>{professionalSentence(form.summary)}</p>
        </section>
      )}

      {form.education.some(item => item.degree || item.institution) && (
        <section className="rb-resume-section">
          <h3>Education</h3>
          {form.education.filter(item => item.degree || item.institution).map((item, index) => (
            <div className="rb-resume-entry" key={index}>
              <strong>{professionalCase(item.degree)}</strong>
              <span>{[professionalCase(item.institution), professionalCase(item.field)].filter(Boolean).join(' • ')}</span>
              <small>{[item.startYear, item.endYear].filter(Boolean).join(' – ')} {item.grade && ` | ${item.grade}`}</small>
            </div>
          ))}
        </section>
      )}

      {form.experience.some(item => item.title || item.company) && (
        <section className="rb-resume-section">
          <h3>Work Experience</h3>
          {form.experience.filter(item => item.title || item.company).map((item, index) => (
            <div className="rb-resume-entry" key={index}>
              <strong>{professionalCase(item.title)}</strong>
              <span>{[professionalCase(item.company), professionalCase(item.location)].filter(Boolean).join(' • ')}</span>
              <small>{item.startDate} – {item.current ? 'Present' : item.endDate}</small>
              {item.responsibilities && <p>{professionalSentence(item.responsibilities)}</p>}
            </div>
          ))}
        </section>
      )}

      {skills.length > 0 && (
        <section className="rb-resume-section">
          <h3>Skills</h3>
          <p>{skills.join(' • ')}</p>
        </section>
      )}

      {form.projects.some(item => item.name || item.description) && (
        <section className="rb-resume-section">
          <h3>Projects</h3>
          {form.projects.filter(item => item.name || item.description).map((item, index) => (
            <div className="rb-resume-entry" key={index}>
              <strong>{professionalCase(item.name)}</strong>
              {item.technologies && <span>Technologies: {professionalCase(item.technologies)}</span>}
              {item.description && <p>{professionalSentence(item.description)}</p>}
              {item.link && <small>{item.link}</small>}
            </div>
          ))}
        </section>
      )}

      {form.languages.trim() && (
        <section className="rb-resume-section">
          <h3>Languages</h3><p>{professionalCase(form.languages)}</p>
        </section>
      )}

      {form.certifications.trim() && (
        <section className="rb-resume-section">
          <h3>Certifications</h3><p>{professionalCase(form.certifications)}</p>
        </section>
      )}

      {form.achievements.trim() && (
        <section className="rb-resume-section">
          <h3>Achievements</h3><p>{professionalSentence(form.achievements)}</p>
        </section>
      )}

      {form.hobbies.trim() && (
        <section className="rb-resume-section">
          <h3>Interests</h3><p>{professionalCase(form.hobbies)}</p>
        </section>
      )}
    </article>
  )
}

function ResumeBuilder({ onBack }) {
  const [form, setForm] = useState(initialForm)
  const [template, setTemplate] = useState('modern')
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState({})

  const [loadingResume, setLoadingResume] = useState(true)
  const [savingResume, setSavingResume] = useState(false)
  const [resumeMessage, setResumeMessage] = useState('')
  const [messageType, setMessageType] = useState('success')

  // Login candidate ka saved resume load karo
  useEffect(() => {
    let active = true

    async function loadResume() {
      try {
        const data = await getCandidateResume()

        if (!active) return

        if (data?.resume) {
          const saved = data.resume

          setForm({
            ...initialForm,
            ...saved,
            education: Array.isArray(saved.education) && saved.education.length
              ? saved.education
              : [{ ...emptyEducation }],
            experience: Array.isArray(saved.experience)
              ? saved.experience
              : [],
            projects: Array.isArray(saved.projects)
              ? saved.projects
              : []
          })

          if (templates.some(item => item.id === saved.template)) {
            setTemplate(saved.template)
          }

          setResumeMessage('Your saved resume has been loaded.')
          setMessageType('success')
        } else {
          setResumeMessage('Create your resume and save it to your account.')
          setMessageType('success')
        }
      } catch (error) {
        if (!active) return

        setResumeMessage(error.message || 'Could not load saved resume.')
        setMessageType('error')
      } finally {
        if (active) setLoadingResume(false)
      }
    }

    loadResume()

    return () => {
      active = false
    }
  }, [])

  const update = (field, value) => {
    setForm(previous => ({ ...previous, [field]: value }))
    setErrors(previous => ({ ...previous, [field]: '' }))
    setResumeMessage('')
  }

  const updateList = (list, index, field, value) => {
    setForm(previous => ({
      ...previous,
      [list]: previous[list].map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }))
    setResumeMessage('')
  }

  const addItem = (list, emptyItem) => {
    setForm(previous => ({
      ...previous,
      [list]: [...previous[list], { ...emptyItem }]
    }))
    setResumeMessage('')
  }

  const removeItem = (list, index) => {
    setForm(previous => ({
      ...previous,
      [list]: previous[list].filter((_, i) => i !== index)
    }))
    setResumeMessage('')
  }

  const validatePersonal = () => {
    const nextErrors = {}

    if (!form.name.trim()) nextErrors.name = 'Full name is required.'
    if (!form.title.trim()) nextErrors.title = 'Professional title is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = 'Enter a valid email address.'
    }
    if (!/^[+0-9\s()-]{7,18}$/.test(form.phone.trim())) {
      nextErrors.phone = 'Enter a valid phone number.'
    }
    if (!form.city.trim()) nextErrors.city = 'City is required.'
    if (!form.summary.trim()) nextErrors.summary = 'Professional summary is required.'

    if (!form.education.some(item =>
      item.degree.trim() && item.institution.trim() && item.endYear.trim()
    )) {
      nextErrors.education = 'Add at least one complete education entry.'
    }

    setErrors(previous => ({
      ...previous,
      name: nextErrors.name || '',
      title: nextErrors.title || '',
      email: nextErrors.email || '',
      phone: nextErrors.phone || '',
      city: nextErrors.city || '',
      summary: nextErrors.summary || '',
      education: nextErrors.education || ''
    }))

    return Object.keys(nextErrors).length === 0
  }

  const validateSkills = () => {
    if (!form.skills.trim()) {
      setErrors(previous => ({
        ...previous,
        skills: 'Add at least one skill.'
      }))
      return false
    }

    setErrors(previous => ({ ...previous, skills: '' }))
    return true
  }

  const nextStep = () => {
    if (step === 0 && !validatePersonal()) return
    if (step === 1 && !validateSkills()) return

    setStep(previous => Math.min(previous + 1, 2))
  }

  const skills = useMemo(
    () => form.skills.split(',').map(item => professionalCase(item.trim())).filter(Boolean),
    [form.skills]
  )

  // Resume backend mein save/update karo
  const handleSaveResume = async () => {
    setSavingResume(true)
    setResumeMessage('')

    try {
      const resumeData = {
        ...form,
        template
      }

      const response = await saveCandidateResume(resumeData)

      setResumeMessage(response.message || 'Resume saved successfully!')
      setMessageType('success')
    } catch (error) {
      setResumeMessage(error.message || 'Resume save nahi ho paya.')
      setMessageType('error')
    } finally {
      setSavingResume(false)
    }
  }

  const handleDownload = () => {
    const personalValid = validatePersonal()
    const skillsValid = validateSkills()

    if (!personalValid) {
      setStep(0)
      return
    }

    if (!skillsValid) {
      setStep(1)
      return
    }

    window.print()
  }

  const input = (value, onChange, placeholder, type = 'text') => (
    <input
      type={type}
      value={value}
      onChange={event => onChange(event.target.value)}
      placeholder={placeholder}
    />
  )

  const textarea = (value, onChange, placeholder) => (
    <textarea
      value={value}
      onChange={event => onChange(event.target.value)}
      placeholder={placeholder}
      rows={4}
    />
  )

  return (
    <div className="rb-app">
      <style>{`
        .rb-app{min-height:100vh;background:#f3f6fb;color:#18263d;padding-bottom:40px}
        .rb-top{background:#fff;padding:18px 5%;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e5eaf2}
        .rb-top button,.rb-button{border:0;border-radius:9px;padding:11px 18px;background:#173b68;color:white;cursor:pointer;font-weight:600}
        .rb-container{max-width:1200px;margin:30px auto;padding:0 20px}
        .rb-heading h1{margin:0 0 8px;font-size:30px}.rb-heading p{color:#68768a}
        .rb-steps{display:flex;gap:10px;margin:24px 0;flex-wrap:wrap}
        .rb-step{padding:10px 16px;border-radius:9px;background:#e5eaf2;color:#56647a}
        .rb-step.active{background:#173b68;color:white}
        .rb-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,.9fr);gap:22px;align-items:start}
        .rb-panel{background:white;border:1px solid #e4e9f1;border-radius:15px;padding:22px;box-shadow:0 5px 20px #1c35500a}
        .rb-panel h2{margin-top:0;font-size:21px}
        .rb-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px}
        .rb-field{display:flex;flex-direction:column;gap:7px;margin-bottom:15px;font-size:13px;font-weight:650;color:#34445c}
        .rb-field input,.rb-field textarea{width:100%;box-sizing:border-box;border:1px solid #d8dfeb;border-radius:8px;padding:11px;font:inherit;font-weight:400;color:#17243a;background:#fff}
        .rb-field textarea{resize:vertical}.rb-field input:focus,.rb-field textarea:focus{outline:2px solid #b6d5ff;border-color:#4388d6}
        .rb-required{color:#df3434}.rb-error{color:#d22;font-weight:500}
        .rb-entry{border:1px solid #e3e9f1;padding:15px;border-radius:10px;margin:14px 0}
        .rb-entry-head{display:flex;justify-content:space-between;align-items:center}
        .rb-remove,.rb-add{border:0;background:#edf4ff;color:#174c85;border-radius:7px;padding:8px 12px;cursor:pointer}
        .rb-add{margin-bottom:15px;font-weight:600}
        .rb-actions{display:flex;justify-content:space-between;gap:10px;margin-top:18px}
        .rb-secondary{background:#eaf0f7!important;color:#173b68!important}
        .rb-designs{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .rb-design{border:2px solid #e2e8f0;background:white;border-radius:10px;padding:15px;text-align:left;cursor:pointer}
        .rb-design.selected{border-color:#2878c8;background:#f1f7ff}
        .rb-design strong,.rb-design span{display:block}.rb-design span{font-size:12px;color:#718096;margin-top:5px}
        .rb-paper{background:white;color:#222;padding:32px;min-height:500px;box-shadow:0 5px 25px #17243a18;font-family:Arial,sans-serif}
        .rb-resume-header{text-align:center;border-bottom:2px solid #23466f;padding-bottom:15px}
        .rb-resume-header h1{font-size:25px;margin:0 0 5px}.rb-resume-header h2{font-size:15px;color:#345b84;margin:0 0 10px}
        .rb-resume-header p{font-size:10px;overflow-wrap:anywhere}
        .rb-resume-section{margin-top:20px}.rb-resume-section h3{font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#23466f;border-bottom:1px solid #cbd5e1;padding-bottom:6px}
        .rb-resume-section p,.rb-resume-entry{font-size:11px;line-height:1.55;white-space:pre-line}
        .rb-resume-entry{margin:10px 0}.rb-resume-entry strong,.rb-resume-entry span,.rb-resume-entry small{display:block}
        .rb-resume-entry small{color:#65748a}
        .rb-corporate{border-top:9px solid #173b68}.rb-corporate .rb-resume-header{text-align:left}
        .rb-ats{box-shadow:none;padding:20px}.rb-ats .rb-resume-header{text-align:left;border-color:#333}
        .rb-ats .rb-resume-section h3{color:#222}
        .rb-creative .rb-resume-header{background:#edf5ff;padding:20px;border-radius:8px}
        .rb-creative .rb-resume-section h3{color:#1672b8}
        .rb-hint{font-size:12px;color:#6c7b90;margin-top:8px}
        .rb-save-status{padding:11px 14px;border-radius:9px;margin:14px 0;font-size:13px}
        .rb-save-success{background:#eaf8ef;color:#176b38}
        .rb-save-error{background:#fff0f0;color:#b42318}
        .rb-save-loading{background:#eef4fc;color:#315b88}
        .rb-save-button{margin:12px 0;background:#14734a!important}
        .rb-save-button:disabled{opacity:.6;cursor:not-allowed}
        @media(max-width:800px){.rb-layout{grid-template-columns:1fr}.rb-grid{grid-template-columns:1fr}.rb-container{padding:0 12px}.rb-paper{padding:20px}}
        @media print{
          @page{size:A4;margin:14mm}
          body{background:white!important}
          body *{visibility:hidden!important}
          .rb-paper,.rb-paper *{visibility:visible!important}
          .rb-paper{position:absolute;left:0;top:0;width:100%;min-height:0;box-shadow:none;padding:0;margin:0}
          .rb-app{background:white!important;padding:0!important}
        }
      `}</style>

      <header className="rb-top">
        <strong>Hire<span style={{color:'#3687d7'}}>AI</span> | Resume Builder</strong>
        <button onClick={onBack}>← Dashboard</button>
      </header>

      <main className="rb-container">
        <div className="rb-heading">
          <h1>Create Your Professional Resume</h1>
          <p>Fill your details, choose a design and create your resume.</p>
        </div>

        {loadingResume && (
          <div className="rb-save-status rb-save-loading">
            Loading your saved resume...
          </div>
        )}

        {!loadingResume && resumeMessage && (
          <div className={`rb-save-status ${messageType === 'error' ? 'rb-save-error' : 'rb-save-success'}`} role="status">
            {resumeMessage}
          </div>
        )}

        <div className="rb-steps">
          {['Personal & Education', 'Experience & Skills', 'Choose Design'].map((name, index) => (
            <div key={name} className={`rb-step ${step === index ? 'active' : ''}`}>
              {index + 1}. {name}
            </div>
          ))}
        </div>

        <div className="rb-layout">
          <section className="rb-panel">
            {step === 0 && <>
              <h2>Personal Information</h2>
              <div className="rb-grid">
                <Field label="Full Name" required error={errors.name}>
                  {input(form.name, value => update('name', value), 'Your full name')}
                </Field>
                <Field label="Professional Title" required error={errors.title}>
                  {input(form.title, value => update('title', value), 'e.g. Software Developer')}
                </Field>
                <Field label="Email Address" required error={errors.email}>
                  {input(form.email, value => update('email', value), 'name@example.com', 'email')}
                </Field>
                <Field label="Mobile Number" required error={errors.phone}>
                  {input(form.phone, value => update('phone', value), '+91 9876543210', 'tel')}
                </Field>
                <Field label="City / Location" required error={errors.city}>
                  {input(form.city, value => update('city', value), 'City, State')}
                </Field>
                <Field label="LinkedIn (Optional)">
                  {input(form.linkedin, value => update('linkedin', value), 'LinkedIn URL')}
                </Field>
                <Field label="GitHub (Optional)">
                  {input(form.github, value => update('github', value), 'GitHub URL')}
                </Field>
                <Field label="Portfolio (Optional)">
                  {input(form.portfolio, value => update('portfolio', value), 'Portfolio URL')}
                </Field>
              </div>

              <Field label="Professional Summary" required error={errors.summary}>
                {textarea(form.summary, value => update('summary', value), 'Write a short professional introduction, your strengths and career goals...')}
              </Field>

              <h2>Education <b className="rb-required">*</b></h2>
              {errors.education && <p className="rb-error">{errors.education}</p>}
              {form.education.map((item, index) => (
                <div className="rb-entry" key={index}>
                  <div className="rb-entry-head">
                    <strong>Education {index + 1}</strong>
                    {form.education.length > 1 && (
                      <button className="rb-remove" onClick={() => removeItem('education', index)}>Remove</button>
                    )}
                  </div>
                  <div className="rb-grid">
                    <Field label="Degree / Qualification">
                      {input(item.degree, value => updateList('education', index, 'degree', value), 'BCA, B.Tech, MBA...')}
                    </Field>
                    <Field label="College / University">
                      {input(item.institution, value => updateList('education', index, 'institution', value), 'Institution name')}
                    </Field>
                    <Field label="Specialization">
                      {input(item.field, value => updateList('education', index, 'field', value), 'Computer Science...')}
                    </Field>
                    <Field label="Percentage / CGPA">
                      {input(item.grade, value => updateList('education', index, 'grade', value), 'e.g. 8.5 CGPA')}
                    </Field>
                    <Field label="Start Year">
                      {input(item.startYear, value => updateList('education', index, 'startYear', value), '2022')}
                    </Field>
                    <Field label="Passing Year">
                      {input(item.endYear, value => updateList('education', index, 'endYear', value), '2025')}
                    </Field>
                  </div>
                </div>
              ))}
              <button className="rb-add" onClick={() => addItem('education', emptyEducation)}>+ Add Education</button>
            </>}

            {step === 1 && <>
              <h2>Work Experience (Optional)</h2>
              {form.experience.map((item, index) => (
                <div className="rb-entry" key={index}>
                  <div className="rb-entry-head">
                    <strong>Experience {index + 1}</strong>
                    <button className="rb-remove" onClick={() => removeItem('experience', index)}>Remove</button>
                  </div>
                  <div className="rb-grid">
                    <Field label="Job Title">{input(item.title, value => updateList('experience', index, 'title', value), 'Job title')}</Field>
                    <Field label="Company">{input(item.company, value => updateList('experience', index, 'company', value), 'Company name')}</Field>
                    <Field label="Location">{input(item.location, value => updateList('experience', index, 'location', value), 'City')}</Field>
                    <Field label="Start Date">{input(item.startDate, value => updateList('experience', index, 'startDate', value), 'Jan 2024')}</Field>
                    <Field label="End Date">{input(item.endDate, value => updateList('experience', index, 'endDate', value), 'Dec 2025')}</Field>
                  </div>
                  <label>
                    <input type="checkbox" checked={item.current}
                      onChange={event => updateList('experience', index, 'current', event.target.checked)} />
                    Currently working here
                  </label>
                  <Field label="Responsibilities & Achievements">
                    {textarea(item.responsibilities, value => updateList('experience', index, 'responsibilities', value), 'Describe your work and achievements...')}
                  </Field>
                </div>
              ))}
              <button className="rb-add" onClick={() => addItem('experience', emptyExperience)}>+ Add Experience</button>

              <h2>Skills <b className="rb-required">*</b></h2>
              <Field label="Skills (comma separated)" required error={errors.skills}>
                {textarea(form.skills, value => update('skills', value), 'React, JavaScript, HTML, CSS, Communication...')}
              </Field>

              <h2>Projects (Optional)</h2>
              {form.projects.map((item, index) => (
                <div className="rb-entry" key={index}>
                  <div className="rb-entry-head">
                    <strong>Project {index + 1}</strong>
                    <button className="rb-remove" onClick={() => removeItem('projects', index)}>Remove</button>
                  </div>
                  <Field label="Project Name">{input(item.name, value => updateList('projects', index, 'name', value), 'Project name')}</Field>
                  <Field label="Technologies Used">{input(item.technologies, value => updateList('projects', index, 'technologies', value), 'React, Node.js...')}</Field>
                  <Field label="Description">{textarea(item.description, value => updateList('projects', index, 'description', value), 'What did you build?')}</Field>
                  <Field label="Project Link">{input(item.link, value => updateList('projects', index, 'link', value), 'Project URL')}</Field>
                </div>
              ))}
              <button className="rb-add" onClick={() => addItem('projects', emptyProject)}>+ Add Project</button>

              <h2>Additional Information (Optional)</h2>
              <Field label="Languages Known">{input(form.languages, value => update('languages', value), 'English, Hindi, Gujarati')}</Field>
              <Field label="Certifications">{textarea(form.certifications, value => update('certifications', value), 'Certification names')}</Field>
              <Field label="Awards & Achievements">{textarea(form.achievements, value => update('achievements', value), 'Your achievements')}</Field>
              <Field label="Hobbies & Interests">{input(form.hobbies, value => update('hobbies', value), 'Reading, sports...')}</Field>
            </>}

            {step === 2 && <>
              <h2>Choose Your Resume Design</h2>
              <p className="rb-hint">Select a design. Your details will automatically appear in that template.</p>
              <div className="rb-designs">
                {templates.map(item => (
                  <button key={item.id}
                    className={`rb-design ${template === item.id ? 'selected' : ''}`}
                    onClick={() => setTemplate(item.id)}>
                    <strong>{item.name}</strong>
                    <span>{item.description}</span>
                    {template === item.id && <span>✓ Selected</span>}
                  </button>
                ))}
              </div>
              <p className="rb-hint">Check the live preview on the right before downloading.</p>
            </>}

            <div className="rb-actions">
              <button className="rb-button rb-secondary"
                onClick={() => setStep(previous => Math.max(0, previous - 1))}
                disabled={step === 0}>← Back</button>

              {step < 2 && (
                <button className="rb-button" onClick={nextStep}>
                  Next Step →
                </button>
              )}
            </div>

            <button
              className="rb-button rb-save-button"
              onClick={handleSaveResume}
              disabled={loadingResume || savingResume}
              style={{ width: '100%' }}
            >
              {savingResume ? 'Saving Resume...' : 'Save Resume to My Account'}
            </button>

            {step === 2 && (
              <button
                className="rb-button"
                onClick={handleDownload}
                style={{ width: '100%', marginTop: '10px' }}
              >
                Download / Save as PDF
              </button>
            )}
          </section>

          <section className="rb-panel rb-preview-panel">
            <h2>Live Resume Preview</h2>
            <p className="rb-hint">Your resume updates as you enter information.</p>
            <ResumePreview form={form} template={template} skills={skills} />
          </section>
        </div>
      </main>
    </div>
  )
}

export default ResumeBuilder
