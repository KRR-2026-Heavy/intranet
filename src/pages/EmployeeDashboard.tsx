import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Chevron from '../components/Chevron'
import DashboardIcon from '../components/DashboardIcon'
import { useAuth } from '../context/AuthContext'
import { logout } from '../services/authService'
import { employeeModuleService } from '../services/employeeModuleService'
import { getPageBackgroundStyle } from '../config/pageBackgrounds'
import type { DashboardOverview } from '../types/employeeModules'

const cards = [
  { title: 'ORGANIZATION BOARD', description: 'Leadership, teams and reporting structure', route: 'organization-board', icon: 'organization' },
  { title: 'DEPARTMENTS', description: 'Explore all company departments', route: 'departments', icon: 'departments' },
  { title: 'COMPANY ANNOUNCEMENTS', description: 'Official updates and company news', route: 'announcements', icon: 'announcements' },
  { title: 'IMPORTANT NOTICES', description: 'Operational and employee instructions', route: 'notices', icon: 'notices' },
  { title: 'MEETING UPDATES', description: 'Schedules, agendas and meeting notes', route: 'meetings', icon: 'meetings' },
  { title: 'QUICK ACCESS', description: 'Frequently used employee resources', route: 'quick-access', icon: 'quick' },
  { title: 'IT SUPPORT', description: 'Submit and track support requests', route: 'it-support', icon: 'support' },
  { title: 'LEAVE MANAGEMENT', description: 'Review available leave types', route: 'leave-management', icon: 'leave' },
  { title: 'COMPANY POLICIES', description: 'Review company policies and documents', route: 'policies', icon: 'policies' },
  { title: 'HOLIDAY LIST', description: 'View published holiday information', route: 'holidays', icon: 'holidays' },
]

export default function EmployeeDashboard() {
  const [profileOpen, setProfileOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [overviewError, setOverviewError] = useState<string | null>(null)

  useEffect(() => {
    employeeModuleService.overview()
      .then(setOverview)
      .catch((error: unknown) => setOverviewError(error instanceof Error ? error.message : 'Dashboard statistics are unavailable.'))
  }, [])
  const visibleCards = cards.filter((card) =>
    `${card.title} ${card.description}`.toLowerCase().includes(search.toLowerCase()),
  )

  async function handleLogout() {
    try {
      await logout()
    } finally {
      setUser(null)
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <Link className="dashboard-brand" to="/employee" aria-label="KRR employee dashboard">
          <img src="/images/KRR new logo.avif" alt="KRR Engineering Private Limited" />
          <div className="dashboard-brand__identity">
            <span>KRR ENGINEERING</span>
            <img src="/images/arrow near the logo.jpeg" alt="" aria-hidden="true" />
          </div>
        </Link>

        <div className="dashboard-header__actions">
          <label className="dashboard-search">
            <span className="sr-only">Search dashboard</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></svg>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
            />
          </label>
          <Link className="dashboard-icon-button" to="/employee/announcements" aria-label="View announcements" title="View announcements">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 00-12 0v5l-2 3h16l-2-3zM9 20h6" /></svg>
          </Link>
          <time className="dashboard-date" dateTime={new Date().toISOString().slice(0, 10)}>
            {new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())}
          </time>
          <div className="dashboard-profile">
            <button
              className="dashboard-profile__button"
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              aria-expanded={profileOpen}
            >
              <span>{user?.name?.[0] ?? 'E'}</span>
              <small>Employee Profile</small>
            </button>
            {profileOpen && (
              <div className="dashboard-profile__menu">
                <button type="button" onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-hero" style={getPageBackgroundStyle('employee-dashboard')}>
          <div className="dashboard-hero__overlay" />
          <div className="dashboard-hero__content">
            <h1>WELCOME TO KRR ENGINEERING</h1>
            <p>Connecting People, Departments and Progress.</p>
          </div>
        </section>

        <section className="dashboard-stats" aria-label="KRR statistics">
          <article><strong>{overview?.employeeProfiles ?? '—'}</strong><span>Active employee profiles</span></article>
          <article><strong>{overview?.departments ?? '—'}</strong><span>Departments</span></article>
          <article><strong>{overview?.publishedAnnouncements ?? '—'}</strong><span>Published announcements</span></article>
          <article><strong>{overview?.currentMeetings ?? '—'}</strong><span>Current meetings</span></article>
        </section>
        {overviewError && <p className="dashboard-data-error" role="status">{overviewError}</p>}

        <section className="dashboard-thoughts-link">
          <div><p>MONTHLY INSPIRATION</p><h2>Thoughts for the Month</h2></div>
          <Link to="/employee/thoughts">View this month’s thought <Chevron className="dashboard-card__chevron" /></Link>
        </section>

        <section className="dashboard-navigation" aria-labelledby="navigation-title">
          <div className="dashboard-section-heading">
            <div>
              <p>EMPLOYEE PORTAL</p>
              <h2 id="navigation-title">Explore KRR Engineering</h2>
            </div>
            <span>{visibleCards.length} services</span>
          </div>

          <div className="dashboard-grid">
            {visibleCards.map((card) => (
              <Link className="dashboard-card" key={card.route} to={`/employee/${card.route}`}>
                <DashboardIcon type={card.icon} className="dashboard-card__icon" />
                <div className="dashboard-card__copy">
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </div>
                <Chevron className="dashboard-card__chevron" />
              </Link>
            ))}
          </div>
          {visibleCards.length === 0 && (
            <div className="dashboard-empty">No dashboard services match “{search}”.</div>
          )}
        </section>
      </main>
    </div>
  )
}
