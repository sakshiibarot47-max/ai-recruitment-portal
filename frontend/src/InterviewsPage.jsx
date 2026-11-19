import { useEffect, useState } from 'react'
import './App.css'
import './pages.css'
import { getMyInterviews, getRecruiterInterviews, getUser } from './api'
import { PageHeader, RecruiterTabs, Notice } from './components'
import { formatInterviewTime } from './utils'

// Ek hi page dono ke liye: candidate ko apne interviews, recruiter ko apni jobs ke interviews (jaldi wala pehle)
function InterviewsPage() {
  const isRecruiter = getUser()?.role?.toLowerCase() === 'recruiter'

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const request = isRecruiter ? getRecruiterInterviews : getMyInterviews

    request()
      .then(data => {
        if (active) setItems(Array.isArray(data) ? data : [])
      })
      .catch(err => {
        if (active) setError(err.message || 'Could not load interviews.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [isRecruiter])

  return (
    <div className="app manage-jobs-page">
      <PageHeader />

      <main className="manage-jobs-content rc-page rc-wide">
        <div className="eyebrow">
          <span className="live-dot" />
          {isRecruiter ? 'RECRUITER WORKSPACE' : 'CANDIDATE WORKSPACE'}
        </div>

        <h1>{isRecruiter ? 'Interviews' : 'My interviews'}</h1>
        <p className="manage-jobs-intro">
          {isRecruiter
            ? 'Interviews you have scheduled, earliest first.'
            : 'Interviews scheduled for your applications, earliest first.'}
        </p>

        {isRecruiter && <RecruiterTabs />}

        <Notice onClose={() => setError('')}>{error}</Notice>

        {loading ? (
          <div className="rc-empty">
            <div className="rc-loader" />
            <h3>Loading interviews...</h3>
            <p>Please wait a moment.</p>
          </div>
        ) : items.length === 0 ? (
          <div className="rc-empty">
            <h3>No interviews scheduled yet</h3>
            <p>
              {isRecruiter
                ? 'Open a job’s applicants and choose “Schedule interview”.'
                : 'When a recruiter schedules an interview, it will show up here.'}
            </p>
          </div>
        ) : (
          <ul className="iv-list">
            {items.map(item => (
              <li className="iv-card" key={item.id}>
                <div className="iv-when">{formatInterviewTime(item.scheduled_at)}</div>

                <div className="iv-main">
                  <h3>{item.job_title}</h3>
                  <p className="iv-sub">
                    {isRecruiter ? item.candidate_name : item.company}
                  </p>
                  {item.location && (
                    <p className="iv-line">
                      {/^https?:\/\//i.test(item.location) ? (
                        <a href={item.location} target="_blank" rel="noreferrer">
                          {item.location}
                        </a>
                      ) : (
                        item.location
                      )}
                    </p>
                  )}
                  {item.notes && <p className="iv-line iv-notes">{item.notes}</p>}
                </div>

                <span className="job-type">{item.mode || 'Online'}</span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

export default InterviewsPage
