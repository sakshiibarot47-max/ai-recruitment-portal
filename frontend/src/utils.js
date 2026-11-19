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

// Server ka time UTC me hota hai ("2026-11-17 09:33:37"). User ke local time me dikhao.
export function formatDateTime(value) {
  if (!value) return '—'

  const text = String(value)
  const parsed = new Date(
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(text) ? text.replace(' ', 'T') + 'Z' : text
  )

  if (Number.isNaN(parsed.getTime())) return '—'

  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

// Interview ka time "2026-11-05 14:30" jaisa saved hota hai. Jaisa saved hai waisa hi dikhao (timezone nahi badalna).
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatInterviewTime(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/)
  if (!match) return value ? String(value) : '—'

  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}, ${match[4]}:${match[5]}`
}
