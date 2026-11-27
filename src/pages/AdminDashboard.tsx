import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Chevron from '../components/Chevron'
import { useAuth } from '../context/AuthContext'
import { logout } from '../services/authService'
import { getAdminOverview } from '../services/adminService'
import type { AdminDashboardOverview, ManagedContentCategory } from '../types/admin'
import AdminContentManager from './AdminContentManager'
import AdminDepartmentManager from './AdminDepartmentManager'
import AdminEmployeeManager from './AdminEmployeeManager'
import AdminPolicyDocumentManager from './AdminPolicyDocumentManager'
import AdminOrganizationChartManager from './AdminOrganizationChartManager'
import AdminThirukkuralManager from './AdminThirukkuralManager'
import { getPageBackgroundStyle } from '../config/pageBackgrounds'

const sections: Array<{
  slug: string
  title: string
  category?: ManagedContentCategory
}> = [
  { slug: 'dashboard-overview', title: 'Dashboard Overview' },
  { slug: 'employee-management', title: 'Employee Management' },
  { slug: 'department-management', title: 'Department Management' },
  { slug: 'company-announcements', title: 'Company Announcements', category: 'announcements' },
  { slug: 'thoughts-for-the-month', title: 'Thoughts for the Month', category: 'thoughts' },
  { slug: 'important-notices', title: 'Important Notices', category: 'notices' },
  { slug: 'meeting-updates', title: 'Meeting Updates', category: 'meetings' },
  { slug: 'holiday-management', title: 'Holiday Management', category: 'holidays' },
  { slug: 'company-policies', title: 'Company Policies', category: 'policies' },
  { slug: 'organization-chart', title: 'Organization Chart' },
]

const categoryCards: Array<{ category: ManagedContentCategory; title: string; slug: string }> = [
  { category: 'announcements', title: 'Company Announcements', slug: 'company-announcements' },
  { category: 'thoughts', title: 'Thoughts for the Month', slug: 'thoughts-for-the-month' },
  { category: 'notices', title: 'Important Notices', slug: 'important-notices' },
  { category: 'meetings', title: 'Meeting Updates', slug: 'meeting-updates' },
  { category: 'holidays', title: 'Holiday Management', slug: 'holiday-management' },
  { category: 'policies', title: 'Company Policies', slug: 'company-policies' },
]

function countText(value: number | null | undefined, storageConfigured: boolean) {
  return storageConfigured && value !== null && value !== undefined ? String(value) : '—'
}

export default function AdminDashboard() {
  const { section } = useParams<{ section: string }>()
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const [overview, setOverview] = useState<AdminDashboardOverview | null>(null)
  const [overviewError, setOverviewError] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    let active = true
    setOverviewError(null)
    getAdminOverview()
      .then((data) => {
        if (active) setOverview(data)
      })
      .catch((error: unknown) => {
        if (active) {
          setOverviewError(
            error instanceof Error ? error.message : 'Administrator dashboard is unavailable.',
          )
        }
      })

    return () => {
      active = false
    }
  }, [section])

  const activeSection = useMemo(
    () => sections.find((item) => item.slug === section) ?? sections[0],
    [section],
  )

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await logout()
    } finally {
      setUser(null)
      navigate('/login', { replace: true })
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="admin-portal">
      <aside className="admin-sidebar">
        <Link className="admin-brand" to="/admin" aria-label="KRR administrator dashboard">
          <img src="/images/KRR new logo.avif" alt="KRR Engineering Private Limited" />
          <span>KRR ENGINEERING</span>
          <img className="admin-brand__chevron" src="/images/arrow near the logo.jpeg" alt="" />
        </Link>

        <p className="admin-sidebar__label">CONTENT MANAGEMENT</p>
        <nav className="admin-nav" aria-label="Administrator navigation">
          {sections.map((item) => (
            <Link
              className={`admin-nav__link${activeSection.slug === item.slug ? ' is-active' : ''}`}
              key={item.slug}
              to={item.slug === 'dashboard-overview' ? '/admin' : `/admin/${item.slug}`}
              aria-current={activeSection.slug === item.slug ? 'page' : undefined}
            >
              <span>{item.title}</span>
              <Chevron className="admin-nav__chevron" />
            </Link>
          ))}
        </nav>
      </aside>

      <div className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-topbar__identity">
            <span>SECURE ADMIN PORTAL</span>
            <strong>{user?.name ?? 'Administrator'}</strong>
          </div>
          <button type="button" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? 'Signing out…' : 'Logout'}
          </button>
        </header>

        <main className="admin-content">
          <div className="admin-heading" style={getPageBackgroundStyle(`admin-${activeSection.slug}`)}>
            <div>
              <p>CONTENT MANAGEMENT</p>
              <h1>{activeSection.title}</h1>
            </div>
            <span className="admin-role-badge">ADMIN</span>
          </div>

          {activeSection.slug === 'organization-chart' ? (
            <AdminOrganizationChartManager />
          ) : activeSection.category ? (
            activeSection.category === 'policies' ? (
              <AdminPolicyDocumentManager />
            ) : activeSection.category === 'thoughts' ? (
              <>
                <AdminThirukkuralManager />
                <AdminContentManager category={activeSection.category} title={activeSection.title} />
              </>
            ) : (
              <AdminContentManager
                category={activeSection.category}
                title={activeSection.title}
              />
            )
          ) : activeSection.slug === 'employee-management' ? (
            <AdminEmployeeManager />
          ) : activeSection.slug === 'department-management' ? (
            <AdminDepartmentManager />
          ) : (
            <>
              {overviewError && <p className="admin-state admin-state--error" role="alert">{overviewError}</p>}
              {!overview && !overviewError && <p className="admin-state" role="status">Loading content overview…</p>}
              {overview && (
                <>
                  {!overview.storageConfigured && (
                    <p className="admin-state" role="status">{overview.unavailableMessage}</p>
                  )}
                  <section className="admin-content-categories" aria-label="Content publishing status">
                    {categoryCards.map((card) => {
                      const counts = overview.categories[card.category]
                      return (
                        <Link className="admin-content-category" key={card.category} to={`/admin/${card.slug}`}>
                          <div className="admin-content-category__heading">
                            <h2>{card.title}</h2>
                            <Chevron className="admin-nav__chevron" />
                          </div>
                          <div className="admin-content-category__counts">
                            <span>Published <strong>{countText(counts?.published, overview.storageConfigured)}</strong></span>
                            <span>Drafts <strong>{countText(counts?.drafts, overview.storageConfigured)}</strong></span>
                            <span>Scheduled <strong>{countText(counts?.scheduled, overview.storageConfigured)}</strong></span>
                          </div>
                        </Link>
                      )
                    })}
                  </section>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
