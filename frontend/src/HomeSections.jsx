import { Button } from './ui'

const BROWSE_TYPES = [
  {
    tag: 'For college students',
    title: 'Internships',
    text: 'Get real work experience, build your resume and see what the job is like before you graduate.',
  },
  {
    tag: 'For graduates',
    title: 'Full-time jobs',
    text: 'Start your career or take the next step with roles that match your skills and your degree.',
  },
  {
    tag: 'For flexible schedules',
    title: 'Part-time jobs',
    text: 'Earn alongside your studies or other commitments with roles that fit around your day.',
  },
]

const CANDIDATE_STEPS = [
  ['Create your profile', 'Sign up with your phone or email, then add your education, skills and resume.'],
  ['Check your match', 'See how well your skills fit a role before you spend time applying.'],
  ['Apply and track', 'Apply in a few clicks and follow every application, from applied to offer, in one place.'],
]

const RECRUITER_STEPS = [
  ['Post a job', 'Add the role, skills and location in a few minutes.'],
  ['Review applicants', 'See every applicant and their resume in a single list.'],
  ['Move them forward', 'Shortlist, interview, offer or reject, and candidates see each update.'],
]

export function BrowseByType({ onStart }) {
  return (
    <section className="content-section" id="browse">
      <div className="section-heading">
        <span className="form-kicker">BROWSE BY TYPE</span>
        <h2>Whatever stage you are at, start here.</h2>
        <p>Internships, full-time jobs and part-time roles in one place. Create an account to see current openings.</p>
      </div>

      <div className="type-grid">
        {BROWSE_TYPES.map(item => (
          <button type="button" className="type-card" key={item.title} onClick={onStart}>
            <span className="type-tag">{item.tag}</span>
            <strong className="type-title">{item.title}</strong>
            <span className="type-text">{item.text}</span>
            <span className="type-cta">
              Sign up to browse <span className="type-arrow" aria-hidden="true">→</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

function Steps({ steps }) {
  return (
    <ol className="how-steps">
      {steps.map(([title, text]) => (
        <li key={title}>
          <strong>{title}</strong>
          <span>{text}</span>
        </li>
      ))}
    </ol>
  )
}

export function HowItWorks({ onCandidate, onRecruiter }) {
  return (
    <section className="content-section" id="how">
      <div className="section-heading">
        <span className="form-kicker">HOW IT WORKS</span>
        <h2>Three simple steps, whichever side you are on.</h2>
        <p>Candidates find and track opportunities. Recruiters post roles and manage applicants.</p>
      </div>

      <div className="how-grid">
        <article className="how-panel">
          <h3>For candidates</h3>
          <p className="how-panel-sub">Students and graduates</p>
          <Steps steps={CANDIDATE_STEPS} />
          <Button variant="primary" onClick={onCandidate}>Get started as a candidate</Button>
        </article>

        <article className="how-panel how-panel-dark">
          <h3>For recruiters</h3>
          <p className="how-panel-sub">Companies and hiring teams</p>
          <Steps steps={RECRUITER_STEPS} />
          <Button variant="accent" onClick={onRecruiter}>Start hiring</Button>
        </article>
      </div>
    </section>
  )
}
