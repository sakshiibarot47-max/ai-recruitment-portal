
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
import Logo from './Logo'
import { BrowseByType, HowItWorks } from './HomeSections'
import { Button } from './ui'
import AuthPanel from './AuthPanel'

function AppContent() {
  const navigate = useNavigate()

  const [mode, setMode] = useState('login')
  const [role, setRole] = useState('candidate')
  const [toast, setToast] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [authKey, setAuthKey] = useState(0) // badalne par login box saaf hokar dobara khulta hai

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

  // Login ya OTP verify hone ke baad: token save karo aur sahi page par bhejo
  function completeLogin(data, welcomeText) {
    const token = data.token || data.accessToken
    const user = data.user || data

    if (!token || !user?.id) {
      notify('error', 'Invalid server response. Please try again.')
      return
    }

    localStorage.setItem('hireai_token', token)
    localStorage.setItem('hireai_user', JSON.stringify(user))

    setLoggedInUser(user)
    notify('success', welcomeText)
    navigate(user.role?.toLowerCase() === 'recruiter' ? '/recruiter/jobs' : '/jobs')
  }

  function logout() {
    localStorage.removeItem('hireai_token')
    localStorage.removeItem('hireai_user')

    setLoggedInUser(null)
    setMode('login')

    navigate('/')
  }

  // Navbar / hero buttons: auth card tak le jao, mode aur role set karke
  function goToAuth(nextMode, nextRole) {
    setMode(nextMode)
    if (nextRole) setRole(nextRole)
    setAuthKey(key => key + 1)
    setMenuOpen(false)
    document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' })
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

      <header className="site-nav">
        <div className="site-nav-inner">
          <a className="site-brand" href="#home" onClick={() => setMenuOpen(false)} aria-label="HireAI home">
            <Logo />
          </a>

          <button
            type="button"
            className="site-nav-toggle"
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpen(open => !open)}
          >
            <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>

          <div id="site-menu" className={`site-nav-menu${menuOpen ? ' is-open' : ''}`}>
            <nav className="site-nav-links" aria-label="Main">
              <a href="#paths" onClick={() => setMenuOpen(false)}>Find work</a>
              <button type="button" onClick={() => goToAuth('register', 'recruiter')}>For recruiters</button>
              <a href="#how" onClick={() => setMenuOpen(false)}>How it works</a>
              <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
              <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
            </nav>

            <div className="site-nav-actions">
              <Button variant="ghost" onClick={() => goToAuth('login')}>Sign in</Button>
              <Button variant="accent" onClick={() => goToAuth('register', 'candidate')}>Get started</Button>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <h1 className="hero-title">Internships for students. Jobs for graduates.</h1>

            <p className="hero-description">
              Build your profile once, see how well you match a role before you
              apply, and track every application in one place. Recruiters get one
              workspace for postings and applicants.
            </p>

            <div className="hero-paths" id="paths">
              <button type="button" className="hero-path" onClick={() => goToAuth('register', 'candidate')}>
                <span className="hero-path-title">Find internships</span>
                <span className="hero-path-sub">For college students</span>
              </button>
              <button type="button" className="hero-path" onClick={() => goToAuth('register', 'candidate')}>
                <span className="hero-path-title">Find jobs</span>
                <span className="hero-path-sub">For graduates</span>
              </button>
              <button type="button" className="hero-path" onClick={() => goToAuth('register', 'recruiter')}>
                <span className="hero-path-title">Hire talent</span>
                <span className="hero-path-sub">For recruiters</span>
              </button>
            </div>

            <p className="hero-aside">Openings are shown after you sign in.</p>
          </div>

          <AuthPanel
            key={authKey}
            mode={mode}
            onModeChange={setMode}
            role={role}
            onRoleChange={setRole}
            onSuccess={completeLogin}
            notify={notify}
          />
        </section>

        <BrowseByType onStart={() => goToAuth('register', 'candidate')} />

        <HowItWorks
          onCandidate={() => goToAuth('register', 'candidate')}
          onRecruiter={() => goToAuth('register', 'recruiter')}
        />

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
          <img className="about-logo" src="/logo-mark.png" alt="" height="76" decoding="async" />

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
              onClick={() => goToAuth('register', 'candidate')}
            >
              Get started →
            </button>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>© {new Date().getFullYear()} HireAI</span>
        <span>Dream Job. Made Easy.</span>
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
