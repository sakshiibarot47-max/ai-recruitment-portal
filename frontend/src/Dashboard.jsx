
import './App.css'
import './pages.css'

function Dashboard({ user, onLogout, onNavigate }) {
  const isRecruiter = user?.role === 'recruiter'

  const candidateFeatures = [
    {
      id: 'jobs',
      icon: '⌕',
      title: 'Find Jobs',
      description: 'Explore job openings that match your skills, interests and career goals.',
      link: 'Explore opportunities',
      tag: 'DISCOVER',
    },
    {
      id: 'saved-jobs',
      icon: '♥',
      title: 'Saved Jobs',
      description: 'Keep your favourite opportunities organised and ready for your next application.',
      link: 'View saved jobs',
      tag: 'BOOKMARKS',
    },
    {
      id: 'applications',
      icon: '✓',
      title: 'My Applications',
      description: 'Track application statuses and manage your submitted job applications.',
      link: 'Track applications',
      tag: 'MY ACTIVITY',
    },
    {
      id: 'resume-builder',
      icon: '▤',
      title: 'Resume Builder',
      description: 'Create a professional resume and download it as a PDF for your next opportunity.',
      link: 'Build your resume',
      tag: 'CAREER PROFILE',
    },
  ]

  const recruiterFeatures = [
    {
      id: 'manage-jobs',
      icon: '▤',
      title: 'My Jobs',
      description: 'Track your published job listings and see how many candidates applied.',
      link: 'Open my jobs',
      tag: 'JOB WORKSPACE',
    },
    {
      id: 'post-job',
      icon: '+',
      title: 'Post a Job',
      description: 'Create a new job opening and start receiving applications.',
      link: 'Post a new job',
      tag: 'HIRING',
    },
    {
      id: 'manage-jobs',
      icon: '♙',
      title: 'Review Applicants',
      description: 'Review candidates, check resumes and move them through your hiring pipeline.',
      link: 'Review candidates',
      tag: 'TALENT',
    },
  ]

  const features = isRecruiter ? recruiterFeatures : candidateFeatures

  return (
    <div className="app dashboard-page">
      <header className="navbar">
        <a
          className="brand"
          href="#dashboard"
          onClick={(event) => {
            event.preventDefault()
            onNavigate('dashboard')
          }}
        >
          <span className="brand-icon">H</span>
          <span>Hire<span>AI</span></span>
        </a>

        <div className="dashboard-nav-actions">
          <span className="dashboard-user-role">
            {isRecruiter ? 'Recruiter Account' : 'Candidate Account'}
          </span>
          <button className="nav-button" onClick={onLogout}>
            Sign out ↗
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-welcome">
          <div>
            <div className="eyebrow">
              <span className="live-dot" />
              HIREAI WORKSPACE
            </div>

            <h1>
              Welcome back,
              <br />
              <span>{user?.name || 'User'}!</span>
            </h1>

            <p>
              {isRecruiter
                ? 'Your hiring workspace is ready. Find and manage the right talent.'
                : 'Your next opportunity could be one click away. Let’s make progress today.'}
            </p>
          </div>

          <div className="dashboard-welcome-mark">
            <span>{isRecruiter ? '♙' : '✦'}</span>
          </div>
        </section>

        <section className="dashboard-account-strip">
          <div className="dashboard-account-icon">
            {String(user?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <span>SIGNED IN AS</span>
            <strong>{user?.email || 'Your account'}</strong>
          </div>
          <span className="dashboard-account-status">
            <span className="live-dot" />
            Active
          </span>
          <button
            type="button"
            className="dashboard-profile-link"
            onClick={() => onNavigate('profile')}
          >
            View profile →
          </button>
        </section>

        <section className="dashboard-workspace">
          <div className="dashboard-section-heading">
            <div>
              <span className="form-kicker">
                {isRecruiter ? 'RECRUITER TOOLS' : 'YOUR CAREER TOOLS'}
              </span>
              <h2>
                {isRecruiter ? 'Recruitment Workspace' : 'Your Workspace'}
              </h2>
              <p>
                {isRecruiter
                  ? 'Everything you need to manage your hiring workflow.'
                  : 'Choose where you want to continue your career journey.'}
              </p>
            </div>

            <span className="dashboard-tool-count">
              {features.length} WORKSPACES
            </span>
          </div>

          <div className="dashboard-actions dashboard-professional-grid">
            {features.map((feature, index) => (
              <button
                type="button"
                className="dashboard-feature dashboard-pro-card"
                key={`${feature.id}-${index}`}
                onClick={() => onNavigate(feature.id)}
              >
                <div className="dashboard-card-top">
                  <span className="feature-icon">
                    {feature.icon}
                  </span>
                  <span className="dashboard-card-tag">
                    {feature.tag}
                  </span>
                </div>

                <h3>{feature.title}</h3>
                <p>{feature.description}</p>

                <span className="dashboard-link">
                  {feature.link} →
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="dashboard-help">
          <div>
            <span className="form-kicker">HIREAI TIP</span>
            <h3>
              {isRecruiter
                ? 'Build your team with confidence.'
                : 'Stay prepared for your next opportunity.'}
            </h3>
            <p>
              {isRecruiter
                ? 'Keep your job listings updated to reach relevant candidates.'
                : 'Keep your resume updated and check your applications regularly.'}
            </p>
          </div>
          <span className="dashboard-help-icon">✦</span>
        </section>

        <footer className="dashboard-footer">
          <span>© {new Date().getFullYear()} HireAI Workspace</span>
          <span>Connecting people with possibilities.</span>
        </footer>
      </main>
    </div>
  )
}

export default Dashboard
