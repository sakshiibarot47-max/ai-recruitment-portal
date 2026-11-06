
import ApplicationsPage from './ApplicationsPage'
import MyJobs from './MyJobs'
import PostJob from './PostJob'
import Applicants from './Applicants'
import JobDetails from './JobDetails'
import ProfilePage from './ProfilePage'
import { useState, useEffect } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate
} from 'react-router-dom'
import './App.css'
import Dashboard from './Dashboard'
import JobsPage from './JobsPage'
import SavedJobsPage from './SavedJobsPage'
import ProtectedRoute from './ProtectedRoute'
import ResumeBuilder from './ResumeBuilder'
import { login as loginRequest, register as registerRequest } from './api'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const NAME_PART_RE = /^[\p{L}][\p{L}'’-]{1,49}$/u

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: p => p.length >= 8 },
  { label: 'One capital letter (A-Z)', test: p => /[A-Z]/.test(p) },
  { label: 'One small letter (a-z)', test: p => /[a-z]/.test(p) },
  { label: 'One number (0-9)', test: p => /[0-9]/.test(p) },
  { label: 'One special character (@, #, !, ...)', test: p => /[^A-Za-z0-9]/.test(p) },
  { label: 'No spaces', test: p => !/\s/.test(p) },
]

function validateForm(mode, { name, email, password, confirmPassword }) {
  if (mode === 'register') {
    const parts = name.trim().split(/\s+/)

    if (parts.length < 2 || !parts.every(x => NAME_PART_RE.test(x))) {
      return 'Enter your first name and surname using letters only.'
    }
  }

  if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address.'
  if (!password) return 'Enter your password.'

  if (mode === 'register') {
    const failed = PASSWORD_RULES.find(r => !r.test(password))

    if (failed) return 'Password rule missing: ' + failed.label + '.'
    if (password !== confirmPassword) return 'Passwords do not match.'
  }

  return ''
}

function AppContent() {
  const navigate = useNavigate()

  const [mode, setMode] = useState('login')
  const [role, setRole] = useState('candidate')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [toast, setToast] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const [loggedInUser, setLoggedInUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hireai_user')) || null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (!toast) return

    const timer = setTimeout(() => setToast(null), 4500)
    return () => clearTimeout(timer)
  }, [toast])

  function notify(type, text) {
    setToast({ type, text, id: Date.now() })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')

    const problem = validateForm(mode, {
      name,
      email,
      password,
      confirmPassword
    })

    if (problem) {
      setMessage(problem)
      notify('error', problem)
      return
    }

    setLoading(true)

    try {
      const payload = mode === 'register'
        ? { name: name.trim(), email: email.trim(), password, role }
        : { email: email.trim(), password }

      const data = mode === 'register'
        ? await registerRequest(payload)
        : await loginRequest(payload)

      if (mode === 'register') {
        notify('success', 'Account created successfully! Please sign in.')
        setMode('login')
        setPassword('')
        setConfirmPassword('')
        setShowPassword(false)
        return
      }

      const token = data.token || data.accessToken
      const user = data.user || data

      if (!token || !user.email) {
        throw new Error('Invalid server response. Check your backend login response.')
      }

      localStorage.setItem('hireai_token', token)
      localStorage.setItem('hireai_user', JSON.stringify(user))

      setLoggedInUser(user)
      setPassword('')

      notify('success', 'Welcome back! Signed in successfully.')

      if (user.role?.toLowerCase() === 'recruiter') {
        navigate('/recruiter/jobs')
      } else {
        navigate('/jobs')
      }
    } catch (error) {
      const text = (error instanceof TypeError || error.message === 'Network Error')
        ? 'Cannot connect to the server. Make sure the backend is running on port 5000.'
        : (error.message || 'Something went wrong.')

      setMessage(text)
      notify('error', text)
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('hireai_token')
    localStorage.removeItem('hireai_user')

    setLoggedInUser(null)
    setMode('login')
    setMessage('')
    setPassword('')

    navigate('/')
  }

  function changeMode(value) {
    setMode(value)
    setMessage('')
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
  }

  // Logged-in workspace with React Router
  if (loggedInUser) {
    // After login a candidate lands on /jobs and a recruiter on /recruiter/jobs
    const homePath =
      loggedInUser.role?.toLowerCase() === 'recruiter'
        ? '/recruiter/jobs'
        : '/jobs'

    return (
      <>
        {toast && (
          <div className={`toast toast-${toast.type}`} role="alert" key={toast.id}>
            <span>{toast.text}</span>
            <button type="button" onClick={() => setToast(null)} aria-label="Close">
              ×
            </button>
          </div>
        )}

        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route
              path="/dashboard"
              element={
                <Dashboard
                  user={loggedInUser}
                  onNavigate={(page) => {
                    const paths = {
                      jobs: '/jobs',
                      'saved-jobs': '/saved-jobs',
                      applications: '/my-applications',
                      'resume-builder': '/resume-builder',
                      'manage-jobs': '/recruiter/jobs',
                      'post-job': '/recruiter/post-job',
                      profile: '/profile',
                    }

                    navigate(paths[page] || '/dashboard')
                  }}
                  onLogout={logout}
                />
              }
            />

            <Route path="/profile" element={<ProfilePage onLogout={logout} />} />

            <Route element={<ProtectedRoute allowedRole="candidate" />}>
              <Route
                path="/jobs"
                element={<JobsPage onBack={() => navigate('/dashboard')} />}
              />

              <Route path="/jobs/:id" element={<JobDetails />} />

              <Route
                path="/saved-jobs"
                element={<SavedJobsPage onBack={() => navigate('/dashboard')} />}
              />

              <Route
                path="/my-applications"
                element={<ApplicationsPage onBack={() => navigate('/dashboard')} />}
              />
              <Route
                path="/resume-builder"
                element={<ResumeBuilder onBack={() => navigate('/dashboard')} />}
              />
            </Route>

            <Route element={<ProtectedRoute allowedRole="recruiter" />}>
              <Route path="/recruiter/jobs" element={<MyJobs />} />
              <Route path="/recruiter/post-job" element={<PostJob />} />
              <Route
                path="/recruiter/jobs/:id/applicants"
                element={<Applicants />}
              />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to={homePath} replace />} />
        </Routes>
      </>
    )
  }

  // Public landing page
  return (
    <div className="app" id="home">
      {toast && (
        <div className={`toast toast-${toast.type}`} role="alert" key={toast.id}>
          <span>{toast.text}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Close">
            ×
          </button>
        </div>
      )}

      <header className="navbar">
        <a className="brand" href="#home">
          <span className="brand-icon">H</span>
          <span>Hire<span>AI</span></span>
        </a>

        <nav className="main-nav">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#about">About</a>
        </nav>

        <div className="nav-actions">
          <button
            className="nav-text-button"
            onClick={() => {
              changeMode('login')
              document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            Sign in
          </button>

          <button
            className="nav-button"
            onClick={() => {
              changeMode('register')
              document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            Get started
          </button>
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="live-dot" />
              SMARTER HIRING STARTS HERE
            </div>

            <h1>
              Find your next
              <br />
              opportunity with <span>HireAI.</span>
            </h1>

            <p className="hero-description">
              A smarter way to connect talent with opportunity.
              Discover exciting careers or find the right people for your team.
            </p>

            <div className="hero-buttons">
              <button
                className="primary-button"
                onClick={() => {
                  changeMode('register')
                  setRole('candidate')
                  document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                Find a Job →
              </button>

              <button
                className="secondary-button"
                onClick={() => {
                  changeMode('register')
                  setRole('recruiter')
                  document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                Hire Talent
              </button>
            </div>

            <div className="hero-points">
              <div><span className="point-check">✓</span> Smart job discovery</div>
              <div><span className="point-check">✓</span> Resume-based skill matching</div>
              <div><span className="point-check">✓</span> One workspace for your hiring journey</div>
            </div>
          </div>

          <section className="auth-card auth-panel" id="auth">
            <div className="auth-card-heading">
              <span className="form-kicker">
                {mode === 'login' ? 'WELCOME BACK' : 'JOIN HIREAI'}
              </span>

              <h2>{mode === 'login' ? 'Sign in to HireAI' : 'Create your account'}</h2>

              <p className="auth-subtitle">
                {mode === 'login'
                  ? 'Enter your details to continue.'
                  : 'Start your journey with HireAI.'}
              </p>
            </div>

            <div className="auth-tabs">
              <button
                type="button"
                className={mode === 'login' ? 'selected' : ''}
                onClick={() => changeMode('login')}
              >
                Sign in
              </button>

              <button
                type="button"
                className={mode === 'register' ? 'selected' : ''}
                onClick={() => changeMode('register')}
              >
                Create account
              </button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {mode === 'register' && (
                <label className="form-field">
                  <span>Full name</span>
                  <input
                    value={name}
                    onChange={event => setName(event.target.value)}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    required
                  />
                </label>
              )}

              <label className="form-field">
                <span>Email address</span>
                <input
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="form-field">
                <span>Password</span>

                <div className="password-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    maxLength={128}
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(value => !value)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>

              {mode === 'register' && (
                <>
                  <ul className="password-rules" aria-live="polite">
                    {PASSWORD_RULES.map(rule => (
                      <li key={rule.label} className={rule.test(password) ? 'ok' : ''}>
                        {rule.label}
                      </li>
                    ))}
                  </ul>

                  <label className="form-field">
                    <span>Confirm password</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={event => setConfirmPassword(event.target.value)}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      maxLength={128}
                      required
                    />
                  </label>
                </>
              )}

              {mode === 'register' && (
                <fieldset className="role-field">
                  <legend>I want to join as</legend>

                  <div className="role-options">
                    <button
                      type="button"
                      className={`role-option ${role === 'candidate' ? 'selected' : ''}`}
                      onClick={() => setRole('candidate')}
                    >
                      <span className="role-symbol">⌕</span>
                      <span>
                        <strong>Candidate</strong>
                        <small>Find opportunities</small>
                      </span>
                      <span className="role-radio">
                        {role === 'candidate' ? '✓' : ''}
                      </span>
                    </button>

                    <button
                      type="button"
                      className={`role-option ${role === 'recruiter' ? 'selected' : ''}`}
                      onClick={() => setRole('recruiter')}
                    >
                      <span className="role-symbol">▤</span>
                      <span>
                        <strong>Recruiter</strong>
                        <small>Hire great talent</small>
                      </span>
                      <span className="role-radio">
                        {role === 'recruiter' ? '✓' : ''}
                      </span>
                    </button>
                  </div>
                </fieldset>
              )}

              {message && <div className="form-message" role="alert">{message}</div>}

              <button
                className="primary-button form-button"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? 'Please wait...'
                  : mode === 'login'
                    ? 'Sign in to your account →'
                    : 'Create my account →'}
              </button>
            </form>

            <p className="auth-switch">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button onClick={() => changeMode(mode === 'login' ? 'register' : 'login')}>
                {mode === 'login' ? 'Create one' : 'Sign in'}
              </button>
            </p>

            <p className="secure-note">Your information is handled securely.</p>
          </section>
        </section>

        <section className="content-section" id="features">
          <div className="section-heading">
            <span className="form-kicker">WHY HIREAI</span>
            <h2>Everything you need to move forward.</h2>
            <p>Simple tools for candidates and recruiters, all in one place.</p>
          </div>

          <div className="content-grid">
            <article className="content-card">
              <span className="content-icon">⌕</span>
              <h3>Discover Opportunities</h3>
              <p>Explore job listings and find roles that fit your skills and goals.</p>
            </article>

            <article className="content-card">
              <span className="content-icon">✳</span>
              <h3>Smart Skill Matching</h3>
              <p>Compare resume skills against job requirements to understand your match.</p>
            </article>

            <article className="content-card">
              <span className="content-icon">▤</span>
              <h3>Recruitment Workspace</h3>
              <p>Give recruiters a place to organize job openings and applicants.</p>
            </article>
          </div>
        </section>

        <section className="about-section" id="about">
          <div className="about-mark">H</div>

          <div>
            <span className="form-kicker">ABOUT HIREAI</span>
            <h2>Better connections. Better possibilities.</h2>

            <p>
              HireAI is designed to make the recruitment journey simpler by
              bringing job discovery, resume matching and hiring workflows
              together in one workspace.
            </p>

            <button
              className="primary-button"
              onClick={() => {
                changeMode('register')
                document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              Get started →
            </button>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>© {new Date().getFullYear()} HireAI</span>
        <span>Connecting people with possibilities.</span>
      </footer>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
