// Shared helpers (status names, dates, scores) used by candidate and recruiter pages

export const STATUSES = ['Applied', 'Shortlisted', 'Interview', 'Offer', 'Rejected']

export const JOB_TYPES = ['Full-time', 'Part-time', 'Internship']

export function normalizeStatus(value) {
  const text = String(value || 'Applied').trim().toLowerCase()
  const exact = STATUSES.find(item => item.toLowerCase() === text)

  if (exact) return exact
  if (text.includes('withdraw')) return 'Withdrawn'
  if (text.includes('shortlist')) return 'Shortlisted'
  if (text.includes('interview')) return 'Interview'
  if (text.includes('offer') || text.includes('accept') || text.includes('select')) return 'Offer'
  if (text.includes('reject')) return 'Rejected'

  return 'Applied'
}

export function formatDate(date) {
  if (!date) return '—'

  // SQLite dates come as "YYYY-MM-DD HH:MM:SS" (UTC)
  const text = String(date)
  const parsed = new Date(
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(text) ? text.replace(' ', 'T') + 'Z' : text
  )

  if (Number.isNaN(parsed.getTime())) return '—'

  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

// match_score is 0-100 or null (resume could not be read)
export function scoreValue(score) {
  if (score === null || score === undefined || score === '') return null

  const number = Number(score)

  return Number.isFinite(number) ? Math.round(number) : null
}

export function skillList(skills) {
  if (Array.isArray(skills)) return skills.filter(Boolean)

  return String(skills || '')
    .split(',')
    .map(skill => skill.trim())
    .filter(Boolean)
}
