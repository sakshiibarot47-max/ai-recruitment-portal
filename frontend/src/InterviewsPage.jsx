import { useEffect, useState } from 'react'
import './App.css'
import './pages.css'
import { getMyInterviews, getRecruiterInterviews, getUser } from './api'
import { PageHeader, RecruiterTabs, Notice } from './components'
import { ScheduleInterviewModal } from './Modals'
import { formatInterviewTime } from './utils'

// Ek hi page dono ke liye: candidate ko apne interviews, recruiter ko apni jobs ke interviews (jaldi wala pehle)
// Recruiter yahan se interview ka time, mode, link ya notes badal sakta hai (Edit).
function InterviewsPage() {
  const isRecruiter = getUser()?.role?.toLowerCase() === 'recruiter'

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState(null)

  // Bumping this number loads the list again (after an interview is edited)
  const [reloadKey, setReloadKey] = useState(0)

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
  }, [isRecruiter, reloadKey])

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
        <Notice type="success" onClose={() => setNotice('')}>{notice}</Notice>

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

                  {isRecruiter && (
                    <div className="iv-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                          setNotice('')
                          setEditing(item)
                        }}
                      >
                        Edit interview
                      </button>
                    </div>
                  )}
                </div>

                <span className="job-type">{item.mode || 'Online'}</span>
              </li>
            ))}
          </ul>
        )}

        {editing && (
          <ScheduleInterviewModal
            applicant={{ name: editing.candidate_name }}
            interview={editing}
            onClose={() => setEditing(null)}
            onScheduled={message => {
              setEditing(null)
              setError('')
              setNotice(message)
              setReloadKey(key => key + 1)
            }}
          />
        )}
      </main>
    </div>
  )
}

export default InterviewsPage
