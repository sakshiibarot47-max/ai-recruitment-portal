import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './pages.css'
import { getRecommendedJobs } from './api'
import { scoreValue } from './utils'

// "Jobs for you": jobs matched to the skills saved in the candidate's profile
function RecommendedJobs() {
  const [state, setState] = useState({ loading: true, jobs: [], failed: false })

  useEffect(() => {
    let active = true

    getRecommendedJobs()
      .then(list => {
        if (active) {
          setState({ loading: false, jobs: Array.isArray(list) ? list : [], failed: false })
        }
      })
      .catch(() => {
        if (active) setState({ loading: false, jobs: [], failed: true })
      })

    return () => {
      active = false
    }
  }, [])

  if (state.loading || state.failed) return null

  if (state.jobs.length === 0) {
    return (
      <section className="rec-hint">
        <div>
          <strong>Get jobs matched to your skills</strong>
          <span>Add your skills in your profile and we will recommend the best-fit jobs here.</span>
        </div>
        <Link to="/profile">Add skills →</Link>
      </section>
    )
  }

  return (
    <section className="rec-section" aria-label="Recommended jobs">
      <div className="rec-title">
        <h2>Recommended for you</h2>
        <span>Based on the skills in your profile</span>
      </div>

      <div className="rec-list">
        {state.jobs.slice(0, 6).map(job => {
          const score = scoreValue(job.matchScore)

          return (
            <Link className="rec-card" key={job.id} to={`/jobs/${job.id}`}>
              <span className="rec-score">{score === null ? '—' : `${score}% match`}</span>
              <strong>{job.title}</strong>
              <small>
                {[job.company, job.location].filter(Boolean).join(' · ') || 'Details not specified'}
              </small>
              {Array.isArray(job.matchedSkills) && job.matchedSkills.length > 0 && (
                <em>Matches: {job.matchedSkills.slice(0, 4).join(', ')}</em>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export default RecommendedJobs
