import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Chevron from '../components/Chevron'
import { useAuth } from '../context/AuthContext'
import { login } from '../services/authService'
import type { UserRole } from '../types/auth'
import { getPageBackgroundStyle } from '../config/pageBackgrounds'

interface LoginPageProps {
  role: UserRole
}

export default function LoginPage({ role }: LoginPageProps) {
  const isAdmin = role === 'ADMIN'
  const [accessCode, setAccessCode] = useState('')
  const [showAccessCode, setShowAccessCode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null,
  )
  const { setUser, sessionError } = useAuth()
  const navigate = useNavigate()

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    if (!accessCode.trim()) {
      setMessage({ type: 'error', text: 'Enter the access code to continue.' })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await login({ role, accessCode: accessCode.trim() })
      setUser(response.user)
      setMessage({ type: 'success', text: 'Authentication successful.' })

      window.setTimeout(() => {
        navigate(isAdmin ? '/admin' : '/employee')
      }, 300)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to sign in.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main
      className={`login-page ${isAdmin ? 'login-page--admin' : 'login-page--employee'}`}
      style={getPageBackgroundStyle(isAdmin ? 'admin-login' : 'employee-login')}
    >
      <div className="login-page__backdrop" aria-hidden="true" />
      <div className="login-page__overlay" aria-hidden="true" />

      <section className="login-split" aria-labelledby="login-title">
        <div className="login-split__brand">
          <Link className="login-brand__link" to="/login" aria-label="Back to login options">
            <img
              className="login-brand__logo"
              src="/images/krr-engineering-logo.png"
              alt="KRR Engineering Private Limited"
            />
          </Link>
          <div className="login-brand__identity">
            <span className="login-brand__name">KRR ENGINEERING</span>
            <img
              className="login-brand__arrow"
              src="/images/arrow near the logo.jpeg"
              alt=""
              aria-hidden="true"
            />
          </div>

          <div className="login-split__headline">
            <p className="login-eyebrow">Employee Intranet Portal</p>
            <h1>Welcome to KRR Engineering</h1>
            <p className="login-tagline">
              Connecting People, Departments and Progress.
            </p>
          </div>
        </div>

        <div className="login-split__panel">
          <form className="login-form" onSubmit={submitLogin} noValidate>
            <p className="login-form__eyebrow">
              {isAdmin ? 'AUTHORIZED PERSONNEL' : 'EMPLOYEE ACCESS'}
            </p>
            <h2 id="login-title">{isAdmin ? 'Administrator Login' : 'Employee Login'}</h2>

            {sessionError && !message && (
              <p className="login-message login-message--error" role="alert">
                {sessionError}
              </p>
            )}

            <label className="login-field" htmlFor="access-code">
              <span>Access code</span>
              <div className="login-field__control">
                <input
                  id="access-code"
                  name="accessCode"
                  type={showAccessCode ? 'text' : 'password'}
                  value={accessCode}
                  onChange={(event) => setAccessCode(event.target.value)}
                  autoComplete={isAdmin ? 'current-password' : 'off'}
                  disabled={isSubmitting}
                  aria-describedby={message ? 'login-message' : undefined}
                />
                <button
                  className="login-field__toggle"
                  type="button"
                  onClick={() => setShowAccessCode((visible) => !visible)}
                  aria-label={showAccessCode ? 'Hide access code' : 'Show access code'}
                  aria-pressed={showAccessCode}
                >
                  {showAccessCode ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            {message && (
              <p
                id="login-message"
                className={`login-message login-message--${message.type}`}
                role={message.type === 'error' ? 'alert' : 'status'}
              >
                {message.text}
              </p>
            )}

            <button className="login-submit" type="submit" disabled={isSubmitting}>
              <span>{isSubmitting ? 'Authenticating...' : 'Secure Login'}</span>
              {isSubmitting ? (
                <span className="login-spinner" aria-hidden="true" />
              ) : (
                <Chevron className="login-submit__chevron" />
              )}
            </button>

            <Link className="login-back" to="/login">
              <Chevron className="login-back__chevron" />
              Back to login options
            </Link>
          </form>
        </div>
      </section>
    </main>
  )
}
