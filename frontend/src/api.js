// All calls to the backend live in this one file.
// Base address of the backend. Change it with VITE_API_URL in frontend/.env if needed.
const BASE_URL = (import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:5000'

// ---------- login session (token + user) ----------
export function saveSession(token, user) {
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
}

export function getToken() {
  return localStorage.getItem('token')
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user'))
  } catch {
    return null
  }
}

export function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

// ---------- one helper that every call uses ----------
async function request(path, { method = 'GET', body, isForm = false, auth = true } = {}) {
  const headers = {}
  const token = getToken()

  if (auth && token) headers.Authorization = 'Bearer ' + token
  if (body && !isForm) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(BASE_URL + path, {
      method,
      headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    })
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?')
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    // reply had no JSON
  }

  if (!res.ok) {
    // token expired or invalid: clear the saved login
    if (res.status === 401 && auth && token) logout()
    throw new Error((data && data.message) || 'Something went wrong')
  }
  return data
}

// ---------- the API functions the pages will call ----------
export const api = {
  // Auth
  register: (name, email, password, role) =>
    request('/auth/register', { method: 'POST', body: { name, email, password, role }, auth: false }),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password }, auth: false }),

  // Jobs (everyone)
  getJobs: (filters = {}) => {
    const q = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => value && q.append(key, value))
    const text = q.toString()
    return request('/jobs' + (text ? '?' + text : ''), { auth: false })
  },
  getJob: (id) => request('/jobs/' + id, { auth: false }),

  // Candidate
  applyToJob: (jobId, file) => {
    const form = new FormData()
    form.append('resume', file) // the field name must be exactly "resume"
    return request('/jobs/' + jobId + '/apply', { method: 'POST', body: form, isForm: true })
  },
  myApplications: () => request('/my/applications'),

  // Recruiter
  createJob: (job) => request('/jobs', { method: 'POST', body: job }),
  getApplicants: (jobId) => request('/jobs/' + jobId + '/applicants'),
  updateStatus: (applicationId, status) =>
    request('/applications/' + applicationId + '/status', { method: 'PUT', body: { status } }),

  // ----- Interviews -----
  // data: { applicationId, scheduledAt: "2026-11-25 14:30", mode: "Online" or "In-person", location, notes }
  scheduleInterview: (data) => request('/interviews', { method: 'POST', body: data }),
  recruiterInterviews: () => request('/interviews'),
  myInterviews: () => request('/interviews/my'),

  // ----- Notifications (candidate and recruiter) -----
  // Returns { unreadCount, notifications: [...] }
  getNotifications: (unreadOnly = false) =>
    request('/notifications' + (unreadOnly ? '?unread=true' : '')),
  markNotificationRead: (id) => request('/notifications/' + id + '/read', { method: 'PUT' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PUT' }),

  // ----- Candidate extras -----
  withdrawApplication: (applicationId) => request('/my/applications/' + applicationId, { method: 'DELETE' }),
  // Returns suggestions only. It does NOT change the profile: show the suggestions in the form,
  // let the user edit them, then save with saveProfile.
  importResume: (file) => {
    const form = new FormData()
    form.append('resume', file)
    return request('/profile/import-resume', { method: 'POST', body: form, isForm: true })
  },
  getProfile: () => request('/profile/me'),
  saveProfile: (fields) => request('/profile/me', { method: 'PUT', body: fields }),

  // Opens the candidate's PDF resume in a new tab (recruiter only).
  // A plain link cannot send the login token, so we fetch the file and open it as a blob.
  openResume: async (applicationId) => {
    let res
    try {
      res = await fetch(BASE_URL + '/applications/' + applicationId + '/resume', {
        headers: { Authorization: 'Bearer ' + getToken() },
      })
    } catch {
      throw new Error('Cannot reach the server. Is the backend running?')
    }
    if (!res.ok) {
      let message = 'Could not open the resume'
      try {
        message = (await res.json()).message || message
      } catch {
        // no JSON in the reply
      }
      throw new Error(message)
    }
    const blob = await res.blob()
    window.open(URL.createObjectURL(blob), '_blank')
  },
}