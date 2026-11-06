import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './App.css'
import './pages.css'
import {
  getUser,
  myApplications,
  getSavedJobs,
  getJobs,
  getApplicants
} from './api'
import { normalizeStatus } from './utils'

function ProfilePage({ onLogout }) {
  const navigate = useNavigate()
  const user = getUser()
  const isRecruiter = user?.role?.toLowerCase() === 'recruiter'

  const [stats, setStats] = useState(null)

  useEffect(() => {
    let active = true

    async function load() {
      if (isRecruiter) {
        const jobsResult = await Promise.allSettled([getJobs()])
        const jobs =
          jobsResult[0].status === 'fulfilled' && Array.isArray(jobsResult[0].value)
            ? jobsResult[0].value.filter(
                job => String(job.recruiter_id) === String(user?.id)
              )
            : null

        let applicants = null

        if (jobs) {
          const lists = await Promise.allSettled(jobs.map(job => getApplicants(job.id)))

          applicants = lists
            .filter(item => item.status === 'fulfilled' && Array.isArray(item.value))
            .flatMap(item => item.value)
        }

        if (active) {
          setStats([
            ['Jobs posted', jobs ? jobs.length : '—'],
            ['Total applicants', applicants ? applicants.length : '—'],
            [
              'Shortlisted',
              applicants
                ? applicants.filter(a => normalizeStatus(a.status) === 'Shortlisted').length
                : '—'
            ]
          ])
        }

        return
      }

      const [apps, saved] = await Promise.allSettled([myApplications(), getSavedJobs()])
      const appList = apps.status === 'fulfilled' && Array.isArray(apps.value) ? apps.value : null
      const savedList = saved.status === 'fulfilled' && Array.isArray(saved.value) ? saved.value : null

      if (active) {
        setStats([
          ['Applications', appList ? appList.length : '—'],
          [
            'Shortlisted / Interview',
            appList
              ? appList.filter(a =>
                  ['Shortlisted', 'Interview'].includes(normalizeStatus(a.status))
                ).length
              : '—'
          ],
          ['Saved jobs', savedList ? savedList.length : '—']
        ])
      }
    }

    load()

    return () => {
      active = false
    }
  }, [isRecruiter, user?.id])

  const links = isRecruiter
    ? [
        ['/recruiter/jobs', 'My jobs'],
        ['/recruiter/post-job', 'Post a job']
      ]
    : [
        ['/jobs', 'Find jobs'],
        ['/saved-jobs', 'Saved jobs'],
        ['/my-applications', 'My applications'],
        ['/resume-builder', 'Resume builder']
      ]

  return (
    <div className="app find-jobs-page">
      <header className="navbar">
        <a
          href="/dashboard"
          className="brand"
          onClick={event => {
            event.preventDefault()
            navigate('/dashboard')
          }}
        >
          <span className="brand-icon">H</span>
          <span>Hire<span>AI</span></span>
        </a>

        <button className="nav-button" onClick={() => navigate('/dashboard')}>
          ← Dashboard
        </button>
      </header>

      <main className="find-jobs-container pf-container">
        <section className="pf-card">
          <div className="pf-avatar">
            {String(user?.name || 'U').trim().charAt(0).toUpperCase()}
          </div>

          <div className="pf-info">
            <span className="pf-role">
              {isRecruiter ? 'Recruiter account' : 'Candidate account'}
            </span>
            <h1>{user?.name || 'User'}</h1>
            <p>{user?.email}</p>
          </div>

          <button type="button" className="pf-signout" onClick={onLogout}>
            Sign out ↗
          </button>
        </section>

        <section className="pf-stats" aria-label="Your activity">
          {(stats || [['…', '…'], ['…', '…'], ['…', '…']]).map(([label, value], index) => (
            <div className="pf-stat" key={`${label}-${index}`}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </section>

        <section className="pf-links">
          <h2>Quick links</h2>
          <div>
            {links.map(([to, label]) => (
              <Link key={to} to={to}>
                {label} →
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default ProfilePage
