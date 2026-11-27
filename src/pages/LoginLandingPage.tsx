import { Link } from 'react-router-dom'
import Chevron from '../components/Chevron'
import { getPageBackgroundStyle } from '../config/pageBackgrounds'

export default function LoginLandingPage() {
  return (
    <main className="login-page login-page--landing" style={getPageBackgroundStyle('login-landing')}>
      <div className="login-page__backdrop" aria-hidden="true" />
      <div className="login-page__overlay" aria-hidden="true" />

      <section className="login-landing" aria-label="KRR Engineering intranet login options">
        <header className="login-brand">
          <img
            className="login-brand__logo"
            src="/images/krr-engineering-logo.png"
            alt="KRR Engineering Private Limited"
          />
          <div className="login-brand__identity">
            <span className="login-brand__name">KRR ENGINEERING</span>
            <img
              className="login-brand__arrow"
              src="/images/arrow near the logo.jpeg"
              alt=""
              aria-hidden="true"
            />
          </div>
        </header>

        <div className="login-landing__content">
          <p className="login-eyebrow">Employee Intranet Portal</p>
          <h1>Welcome to KRR Engineering</h1>
          <p className="login-tagline">
            Connecting People, Departments and Progress.
          </p>

          <div className="login-options">
            <Link className="login-option" to="/employee/login">
              <span>
                <small>EMPLOYEE PORTAL</small>
                <strong>Employee Login</strong>
              </span>
              <Chevron className="login-option__chevron" />
            </Link>

            <Link className="login-option" to="/admin/login">
              <span>
                <small>ADMINISTRATOR PORTAL</small>
                <strong>Administrator Login</strong>
              </span>
              <Chevron className="login-option__chevron" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
