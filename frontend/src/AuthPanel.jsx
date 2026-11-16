import { useEffect, useState } from 'react'
import { login, register, verifyOtp, resendOtp, forgotPassword, resetPassword } from './api'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const NAME_PART_RE = /^[\p{L}][\p{L}'’-]{1,49}$/u
const RESEND_SECONDS = 30

const PASSWORD_RULES = [
  { test: p => p.length >= 8, message: 'Password must be at least 8 characters.' },
  { test: p => !/\s/.test(p), message: 'Password cannot contain spaces.' },
  { test: p => /[A-Z]/.test(p), message: 'Add at least one capital letter (A-Z).' },
  { test: p => /[a-z]/.test(p), message: 'Add at least one small letter (a-z).' },
  { test: p => /[0-9]/.test(p), message: 'Add at least one number (0-9).' },
  { test: p => /[^A-Za-z0-9]/.test(p), message: 'Add at least one special character, like @ # ! $.' },
]

// Bahut aasan password ke tukde (backend me bhi yahi list hai)
const COMMON_PARTS = ['password', 'qwerty', '123456', 'abcdef', 'letmein', 'hireai']

function isEmail(value) {
  return EMAIL_RE.test(value.trim())
}

// Indian mobile: 9876543210, +91 98765 43210, 09876543210
function isPhone(value) {
  let digits = value.replace(/[\s\-().]/g, '')
  if (digits.startsWith('+')) digits = digits.slice(1)
  if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2)
  else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1)
  return /^[6-9]\d{9}$/.test(digits)
}

function isContact(value) {
  const v = value.trim()
  return v.includes('@') ? isEmail(v) : isPhone(v)
}

function nameProblem(name) {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2 || !parts.every(x => NAME_PART_RE.test(x))) {
    return 'Enter your first name and surname using letters only.'
  }
  return ''
}

// Ek baar me sirf ek sabse pehli kami batata hai. context: { name, contacts: [email ya phone ...] }
function passwordProblem(password, { name = '', contacts = [] } = {}) {
  if (!password) return 'Enter a password.'

  const failed = PASSWORD_RULES.find(rule => !rule.test(password))
  if (failed) return failed.message

  const lower = password.toLowerCase()
  if (COMMON_PARTS.some(part => lower.includes(part))) {
    return 'This password is too easy to guess. Choose a different one.'
  }

  const mine = name.toLowerCase().split(/\s+/).filter(part => part.length >= 3)
  contacts.forEach(value => {
    const v = String(value || '').trim().toLowerCase()
    if (v.includes('@')) {
      const local = v.split('@')[0]
      if (local.length >= 3) mine.push(local)
    } else {
      const digits = v.replace(/\D/g, '').slice(-10)
      if (digits.length === 10) mine.push(digits)
    }
  })
  if (mine.some(part => lower.includes(part))) {
    return 'Password cannot contain your name, email or phone number.'
  }
  return ''
}

function PasswordField({ label, value, onChange, onBlur, show, onToggle, autoComplete, placeholder, error }) {
  return (
    <label className={`form-field${error ? ' has-error' : ''}`}>
      <span>{label}</span>
      <div className="password-wrap">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={event => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={64}
          aria-invalid={error ? true : undefined}
          required
        />
        <button
          type="button"
          className="password-toggle"
          onClick={onToggle}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      {error && <small className="field-error" role="alert">{error}</small>}
    </label>
  )
}

const HEADINGS = {
  login: ['WELCOME BACK', 'Sign in to HireAI', 'Enter your details to continue.'],
  register: ['JOIN HIREAI', 'Create your account', 'Start your journey with HireAI.'],
  forgot: ['RESET PASSWORD', 'Forgot your password?', 'Enter your email or mobile number and we will send you a 6 digit code.'],
}

export default function AuthPanel({ mode, onModeChange, role, onRoleChange, onSuccess, notify }) {
  // view: form (sign in / create account), otp, forgot, reset
  const [view, setView] = useState('form')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [code, setCode] = useState('')
  const [pending, setPending] = useState({ contact: '', sentTo: '' })
  const [cooldown, setCooldown] = useState(0)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const timer = setTimeout(() => setCooldown(value => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  function go(nextView, nextMessage = '') {
    setView(nextView)
    setMessage(nextMessage)
    setCode('')
    setPassword('')
    setShowPassword(false)
    setPasswordTouched(false)
  }

  function switchMode(nextMode) {
    onModeChange(nextMode)
    go('form')
  }

  // Naam / email / phone ka password me hona rokne ke liye
  function passwordContext() {
    if (view === 'reset') return { contacts: [pending.contact] }
    return { name, contacts: role === 'recruiter' ? [email, phone] : [contact] }
  }

  // Red line sirf tab dikhti hai jab user ne password likh ke aage badha ho (ya submit dabaya ho)
  const passwordError = passwordTouched ? passwordProblem(password, passwordContext()) : ''

  function fail(error) {
    const text = (error instanceof TypeError || error.message === 'Network Error')
      ? 'Cannot connect to the server. Make sure the backend is running on port 5000.'
      : (error.message || 'Something went wrong.')
    setMessage(text)
    notify('error', text)
  }

  function problem(text) {
    setMessage(text)
    notify('error', text)
  }

  async function run(task) {
    setMessage('')
    setLoading(true)
    try {
      await task()
    } catch (error) {
      fail(error)
    } finally {
      setLoading(false)
    }
  }

  function submitLogin(event) {
    event.preventDefault()
    if (!isContact(contact)) return problem('Enter a valid email or mobile number.')
    if (!password) return problem('Enter your password.')

    return run(async () => {
      try {
        const data = await login({ identifier: contact.trim(), password })
        onSuccess(data, 'Welcome back! Signed in successfully.')
      } catch (error) {
        if (error.status === 403 && error.data?.needsVerification) {
          // Account bana hai par verify nahi hua: naya code bhejo aur OTP screen dikhao
          const target = error.data.contact || contact.trim()
          let sentTo = ''
          try {
            const sent = await resendOtp({ contact: target })
            sentTo = sent.sentTo || ''
            setCooldown(RESEND_SECONDS)
          } catch (resendError) {
            if (resendError.data?.retryAfter) setCooldown(resendError.data.retryAfter)
          }
          setPending({ contact: target, sentTo })
          go('otp', 'Please verify your account first.')
          return
        }
        throw error
      }
    })
  }

  function submitRegister(event) {
    event.preventDefault()

    const nameIssue = nameProblem(name)
    if (nameIssue) return problem(nameIssue)

    let payload
    if (role === 'recruiter') {
      if (company.trim().length < 2) return problem('Enter your company name.')
      if (!isEmail(email)) return problem('Enter a valid work email address.')
      if (!isPhone(phone)) return problem('Enter a valid 10 digit mobile number.')
      payload = { name: name.trim(), company_name: company.trim(), email: email.trim(), phone: phone.trim(), role }
    } else {
      if (!isContact(contact)) return problem('Enter a valid email or mobile number.')
      payload = { name: name.trim(), contact: contact.trim(), role }
    }

    if (passwordProblem(password, passwordContext())) {
      setPasswordTouched(true)
      return undefined
    }
    payload.password = password

    return run(async () => {
      const data = await register(payload)

      if (!data.needsVerification) {
        // Purana backend (REQUIRE_VERIFICATION=false): seedha sign in
        notify('success', 'Account created successfully! Please sign in.')
        onModeChange('login')
        go('form')
        return
      }

      setPending({ contact: data.contact, sentTo: data.sentTo })
      setCooldown(RESEND_SECONDS)
      go('otp')
    })
  }

  function submitOtp(event) {
    event.preventDefault()
    if (!/^\d{6}$/.test(code)) return problem('Enter the 6 digit code.')

    return run(async () => {
      const data = await verifyOtp({ contact: pending.contact, code })
      onSuccess(data, 'Account verified. Welcome to HireAI!')
    })
  }

  async function resend() {
    setMessage('')
    try {
      const sent = await resendOtp({ contact: pending.contact })
      setPending(current => ({ ...current, sentTo: sent.sentTo || current.sentTo }))
      setCooldown(RESEND_SECONDS)
      notify('success', 'We sent you a new code.')
    } catch (error) {
      if (error.data?.retryAfter) setCooldown(error.data.retryAfter)
      fail(error)
    }
  }

  function submitForgot(event) {
    event.preventDefault()
    if (!isContact(contact)) return problem('Enter a valid email or mobile number.')

    return run(async () => {
      await forgotPassword({ contact: contact.trim() })
      setPending({ contact: contact.trim(), sentTo: contact.trim() })
      go('reset')
    })
  }

  function submitReset(event) {
    event.preventDefault()
    if (!/^\d{6}$/.test(code)) return problem('Enter the 6 digit code.')
    if (passwordProblem(password, passwordContext())) {
      setPasswordTouched(true)
      return undefined
    }

    return run(async () => {
      await resetPassword({ contact: pending.contact, code, newPassword: password })
      notify('success', 'Password updated. Please sign in with your new password.')
      onModeChange('login')
      setContact(pending.contact)
      go('form')
    })
  }

  const heading = view === 'otp'
    ? ['VERIFY', 'Enter your code', `We sent a 6 digit code to ${pending.sentTo || pending.contact}.`]
    : view === 'reset'
      ? ['RESET PASSWORD', 'Set a new password', `Enter the code we sent to ${pending.sentTo}, and choose a new password.`]
      : HEADINGS[view === 'forgot' ? 'forgot' : mode]

  return (
    <section className="auth-card auth-panel" id="auth">
      <div className="auth-card-heading">
        <span className="form-kicker">{heading[0]}</span>
        <h2>{heading[1]}</h2>
        <p className="auth-subtitle">{heading[2]}</p>
      </div>

      {view === 'form' && (
        <div className="auth-tabs">
          <button type="button" className={mode === 'login' ? 'selected' : ''} onClick={() => switchMode('login')}>
            Sign in
          </button>
          <button type="button" className={mode === 'register' ? 'selected' : ''} onClick={() => switchMode('register')}>
            Create account
          </button>
        </div>
      )}

      {view === 'form' && mode === 'login' && (
        <form className="auth-form" onSubmit={submitLogin} noValidate>
          <label className="form-field">
            <span>Email or mobile number</span>
            <input
              value={contact}
              onChange={event => setContact(event.target.value)}
              placeholder="you@example.com or 98765 43210"
              autoComplete="username"
              required
            />
          </label>

          <PasswordField
            label="Password"
            value={password}
            onChange={setPassword}
            show={showPassword}
            onToggle={() => setShowPassword(value => !value)}
            autoComplete="current-password"
            placeholder="Enter your password"
          />

          <div className="auth-forgot-row">
            <button type="button" className="auth-link" onClick={() => go('forgot')}>
              Forgot password?
            </button>
          </div>

          {message && <div className="form-message" role="alert">{message}</div>}

          <button className="primary-button form-button" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : 'Sign in to your account →'}
          </button>
        </form>
      )}

      {view === 'form' && mode === 'register' && (
        <form className="auth-form" onSubmit={submitRegister} noValidate>
          <fieldset className="role-field">
            <legend>I want to join as</legend>
            <div className="role-options">
              <button
                type="button"
                className={`role-option ${role === 'candidate' ? 'selected' : ''}`}
                onClick={() => onRoleChange('candidate')}
              >
                <span className="role-symbol">⌕</span>
                <span>
                  <strong>Candidate</strong>
                  <small>Find opportunities</small>
                </span>
                <span className="role-radio">{role === 'candidate' ? '✓' : ''}</span>
              </button>
              <button
                type="button"
                className={`role-option ${role === 'recruiter' ? 'selected' : ''}`}
                onClick={() => onRoleChange('recruiter')}
              >
                <span className="role-symbol">▤</span>
                <span>
                  <strong>Recruiter</strong>
                  <small>Hire great talent</small>
                </span>
                <span className="role-radio">{role === 'recruiter' ? '✓' : ''}</span>
              </button>
            </div>
          </fieldset>

          <label className="form-field">
            <span>Full name</span>
            <input
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="Enter your full name"
              autoComplete="name"
              required
            />
          </label>

          {role === 'recruiter' ? (
            <>
              <label className="form-field">
                <span>Company name</span>
                <input
                  value={company}
                  onChange={event => setCompany(event.target.value)}
                  placeholder="Where do you hire?"
                  autoComplete="organization"
                  maxLength={100}
                  required
                />
              </label>
              <label className="form-field">
                <span>Work email</span>
                <input
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                />
              </label>
              <label className="form-field">
                <span>Mobile number</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={event => setPhone(event.target.value)}
                  placeholder="10 digit mobile number"
                  autoComplete="tel"
                  required
                />
              </label>
            </>
          ) : (
            <label className="form-field">
              <span>Email or mobile number</span>
              <input
                value={contact}
                onChange={event => setContact(event.target.value)}
                placeholder="you@example.com or 98765 43210"
                autoComplete="username"
                required
              />
            </label>
          )}

          <PasswordField
            label="Password"
            value={password}
            onChange={setPassword}
            show={showPassword}
            onToggle={() => setShowPassword(value => !value)}
            onBlur={() => password && setPasswordTouched(true)}
            error={passwordError}
            autoComplete="new-password"
            placeholder="Create a password"
          />

          {message && <div className="form-message" role="alert">{message}</div>}

          <button className="primary-button form-button" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : 'Create my account →'}
          </button>
        </form>
      )}

      {view === 'otp' && (
        <form className="auth-form" onSubmit={submitOtp} noValidate>
          <label className="form-field">
            <span>6 digit code</span>
            <input
              className="otp-input"
              value={code}
              onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="······"
              maxLength={6}
              autoFocus
              required
            />
          </label>

          {message && <div className="form-message" role="alert">{message}</div>}

          <button className="primary-button form-button" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : 'Verify and continue →'}
          </button>

          <div className="auth-otp-row">
            <span>Did not get the code?</span>
            <button type="button" className="auth-link" onClick={resend} disabled={cooldown > 0}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
          <button type="button" className="auth-link auth-back" onClick={() => switchMode(mode)}>
            ← Use a different email or number
          </button>
        </form>
      )}

      {view === 'forgot' && (
        <form className="auth-form" onSubmit={submitForgot} noValidate>
          <label className="form-field">
            <span>Email or mobile number</span>
            <input
              value={contact}
              onChange={event => setContact(event.target.value)}
              placeholder="you@example.com or 98765 43210"
              autoComplete="username"
              autoFocus
              required
            />
          </label>

          {message && <div className="form-message" role="alert">{message}</div>}

          <button className="primary-button form-button" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : 'Send me a code →'}
          </button>
          <button type="button" className="auth-link auth-back" onClick={() => switchMode('login')}>
            ← Back to sign in
          </button>
        </form>
      )}

      {view === 'reset' && (
        <form className="auth-form" onSubmit={submitReset} noValidate>
          <label className="form-field">
            <span>6 digit code</span>
            <input
              className="otp-input"
              value={code}
              onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="······"
              maxLength={6}
              autoFocus
              required
            />
          </label>

          <PasswordField
            label="New password"
            value={password}
            onChange={setPassword}
            show={showPassword}
            onToggle={() => setShowPassword(value => !value)}
            onBlur={() => password && setPasswordTouched(true)}
            error={passwordError}
            autoComplete="new-password"
            placeholder="Create a new password"
          />

          {message && <div className="form-message" role="alert">{message}</div>}

          <button className="primary-button form-button" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : 'Update password →'}
          </button>
          <button type="button" className="auth-link auth-back" onClick={() => go('forgot')}>
            ← Send a new code
          </button>
        </form>
      )}

      {view === 'form' && (
        <p className="auth-switch">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button type="button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </button>
        </p>
      )}

      <p className="secure-note">Your information is handled securely.</p>
    </section>
  )
}
