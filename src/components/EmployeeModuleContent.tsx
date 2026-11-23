import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Chevron from './Chevron'
import DashboardIcon from './DashboardIcon'
import { employeeModuleService } from '../services/employeeModuleService'
import type {
  Holiday,
  Meeting,
  MonthlyThought,
  EmployeePolicySection,
  PublishedContent,
} from '../types/employeeModules'

export type ModuleKey =
  | 'announcements'
  | 'thoughts'
  | 'notices'
  | 'meetings'
  | 'quick-access'
  | 'it-support'
  | 'leave-management'
  | 'policies'
  | 'holidays'

const quickLinks = [
  { title: 'IT Support', description: 'Get assistance through the official IT support form.', route: 'it-support', icon: 'support' },
  { title: 'Company Policies', description: 'Read company policy information.', route: 'policies', icon: 'policies' },
  { title: 'Holiday List', description: 'Review holidays published by HR / Administration.', route: 'holidays', icon: 'holidays' },
  { title: 'Leave Management', description: 'Review available leave types.', route: 'leave-management', icon: 'leave' },
  { title: 'Important Notices', description: 'Read operational and employee notices.', route: 'notices', icon: 'notices' },
  { title: 'Meeting Updates', description: 'View meeting recurrence and published details.', route: 'meetings', icon: 'meetings' },
  { title: 'Organization Board', description: 'Find supplied leadership and team information.', route: 'organization-board', icon: 'organization' },
  { title: 'Departments', description: 'Browse all 16 company departments.', route: 'departments', icon: 'departments' },
]

const leaveTypes = [
  { name: 'Casual Leave', description: 'Short-term time away for personal matters.' },
  { name: 'Sick Leave', description: 'Time away from work due to illness or recovery.' },
  { name: 'Earned Leave', description: 'Time off earned through service.' },
  { name: 'Maternity Leave', description: 'Time away related to pregnancy and childbirth.' },
  { name: 'Paternity Leave', description: 'Time away to support family after a birth.' },
  { name: 'Compensatory Off', description: 'Time off in place of eligible additional work.' },
  { name: 'Loss of Pay', description: 'Unpaid time away from work.' },
]

function displayContentDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function contentDateParts(value: string | null) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null
  }
  return { year, month: month - 1 }
}

function policyText(policy: EmployeePolicySection) {
  const content = policy.content.trim()
  const effectiveDate = policy.effectiveDate && !/^Effective Date\s*:/im.test(content)
    ? `Effective Date: ${policy.effectiveDate}`
    : null
  return [policy.title, effectiveDate, content].filter(Boolean).join('\n\n')
}

function useContent<T>(loader: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    loader()
      .then((result) => { if (active) setData(result) })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load this information.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [loader])

  return { data, loading, error }
}

function ContentList({ kind }: { kind: 'announcements' | 'notices' }) {
  const loader = kind === 'announcements'
    ? employeeModuleService.announcements
    : employeeModuleService.notices
  const { data, loading, error } = useContent<PublishedContent[]>(loader, [])
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('')
  const [priority, setPriority] = useState('')
  const [date, setDate] = useState('')
  const filtered = useMemo(() => data.filter((entry) => {
    const searchable = kind === 'announcements'
      ? `${entry.title} ${entry.description} ${entry.department ?? ''} ${entry.priority}`
      : `${entry.title} ${entry.description}`
    return searchable.toLowerCase().includes(query.toLowerCase()) &&
      (!department || entry.department === department) &&
      (kind !== 'announcements' || !priority || entry.priority === priority) &&
      (kind !== 'announcements' || !date || entry.date === date)
  }), [data, query, department, priority, date, kind])
  const departments = [...new Set(data.map((entry) => entry.department).filter((value): value is string => Boolean(value)))]
  const title = kind === 'announcements' ? 'Company Announcements' : 'Important Notices'

  return (
    <section className="employee-module-section">
      <div className="employee-module-heading">
        <div><p>EMPLOYEE UPDATES</p><h1>{title}</h1></div>
        <div className="employee-module-filters">
          <label className="employee-filter"><span className="sr-only">Search updates</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search updates" /></label>
          {departments.length > 0 && (
            <label className="employee-filter"><span className="sr-only">Filter by department</span>
              <select value={department} onChange={(event) => setDepartment(event.target.value)}>
                <option value="">All departments</option>
                {departments.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
              </select>
            </label>
          )}
          {kind === 'announcements' && (
            <>
              <label className="employee-filter">
                <span className="sr-only">Filter by priority</span>
                <select value={priority} onChange={(event) => setPriority(event.target.value)}>
                  <option value="">All priorities</option>
                  {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((value) => <option key={value}>{value}</option>)}
                </select>
              </label>
              <label className="employee-filter">
                <span className="sr-only">Filter by announcement date</span>
                <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </label>
            </>
          )}
        </div>
      </div>
      {error && <p className="employee-error" role="alert">{error}</p>}
      {loading && <p className="employee-loading">Loading published updates…</p>}
      {!loading && !error && filtered.length === 0 && (
        <div className="employee-empty">
          {data.length === 0 ? `There are no published ${kind} available.` : 'No updates match your search.'}
        </div>
      )}
      <div className="published-content-list">
        {filtered.map((entry) => <article className="employee-content-card" key={entry.id}>
          <div className="published-content-card__meta">
            {entry.pinned && <span className="content-pin">Pinned</span>}
            <span>{kind === 'announcements' ? displayContentDate(entry.date) : entry.date}</span>
            {kind === 'announcements' && entry.expiresOn && <span>Expires {displayContentDate(entry.expiresOn)}</span>}
            {entry.department && <span>{entry.department}</span>}
            <span className={`content-priority content-priority--${entry.priority.toLowerCase()}`}>{entry.priority}</span>
          </div>
          <h2>{entry.title}</h2>
          {kind === 'announcements' ? (
            <>
              <p className="announcement-description">{entry.description}</p>
              <details className="announcement-read-more">
                <summary>Read More</summary>
                <p>{entry.description}</p>
              </details>
            </>
          ) : <p>{entry.description}</p>}
        </article>)}
      </div>
    </section>
  )
}

function MonthlyThoughtPage() {
  const { data, loading, error } = useContent<MonthlyThought | null>(employeeModuleService.monthlyThought, null)
  return (
    <section className="thoughts-page">
      <p className="thoughts-page__eyebrow">A MOMENT OF INSPIRATION</p>
      <h1>THOUGHTS FOR THE MONTH</h1>
      {error && <p className="employee-error" role="alert">{error}</p>}
      {loading ? <p className="employee-loading">Loading this month's thought…</p> : data ? (
        <article className="thought-card">
          <span>{data.month} {data.year}</span><h2>{data.heading}</h2><p>{data.message}</p>
          {data.author && <small>— {data.author}</small>}
        </article>
      ) : <p className="employee-empty">No monthly thought has been published.</p>}
    </section>
  )
}

function MeetingsPage() {
  const { data, loading, error } = useContent<Meeting[]>(employeeModuleService.meetings, [])
  return (
    <section className="employee-module-section">
      <div className="employee-module-heading"><div><p>COMPANY SCHEDULE</p><h1>Meeting Updates</h1></div></div>
      {error && <p className="employee-error" role="alert">{error}</p>}
      {loading && <p className="employee-loading">Loading meeting updates…</p>}
      {!loading && !error && data.length === 0 && <p className="employee-empty">No meeting updates have been published.</p>}
      {!loading && data.map((meeting, index) => (
        <article className="meeting-card" key={`${meeting.title}-${index}`}>
          <DashboardIcon type="meetings" className="meeting-card__icon" />
          <div><p>{meeting.recurrence ?? (meeting.date ?? 'Date not published')}</p><h2>{meeting.title}</h2>
            <span>{meeting.time && `${meeting.time} · `}{meeting.location ?? 'Time and location have not been provided.'}</span>
            {meeting.agenda && <p>{meeting.agenda}</p>}
          </div>
        </article>
      ))}
    </section>
  )
}

function QuickAccessPage() {
  return (
    <section className="employee-module-section">
      <div className="employee-module-heading"><div><p>EMPLOYEE RESOURCES</p><h1>Quick Access</h1></div></div>
      <div className="quick-access-grid">
        {quickLinks.map((item) => <Link className="dashboard-card" key={item.route} to={`/employee/${item.route}`}>
          <DashboardIcon type={item.icon} className="dashboard-card__icon" />
          <div className="dashboard-card__copy"><h3>{item.title}</h3><p>{item.description}</p></div>
          <Chevron className="dashboard-card__chevron" />
        </Link>)}
      </div>
    </section>
  )
}

function ITSupportPage() {
  return (
    <section className="employee-module-section">
      <div className="employee-module-heading"><div><p>HELP DESK</p><h1>IT Support</h1></div></div>
      <article className="employee-content-card it-support-card">
        <DashboardIcon type="support" className="it-support-card__icon" />
        <div><h2>Submit an IT support request</h2>
          <p>Use the official KRR Engineering IT support form to report an issue or request assistance.</p>
          <a className="employee-primary-button" href="https://forms.gle/mcFYyvpKhGbsvtBJ8" target="_blank" rel="noopener noreferrer">
            Open IT Support Form <Chevron className="employee-primary-button__chevron" />
          </a>
        </div>
      </article>
    </section>
  )
}

function LeaveManagementPage() {
  return (
    <section className="employee-module-section">
      <div className="employee-module-heading"><div><p>EMPLOYEE SERVICES</p><h1>Leave Management</h1></div></div>
      <div className="leave-type-grid">
        {leaveTypes.map((leave) => (
          <article className="leave-type-card" key={leave.name}>
            <h2>{leave.name}</h2>
            <p>{leave.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function PolicyPage() {
  const { data, loading, error } = useContent(employeeModuleService.policy, null)
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null)
  const policies = data?.sections.map((policy, index) => ({
    id: `${index}-${policy.title}`,
    title: policy.title,
    text: policyText(policy),
  })) ?? []
  const selectedPolicy = policies.find((policy) => policy.id === selectedPolicyId)

  function downloadPolicy(text: string, id: string) {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${id}.txt`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  if (selectedPolicy) {
    return (
      <section className="employee-module-section policy-page">
        <div className="policy-reading-toolbar">
          <button className="policy-back-button" type="button" onClick={() => setSelectedPolicyId(null)}>
            Back to policies
          </button>
          <div className="policy-actions">
            <button type="button" onClick={() => window.print()}>Print</button>
            <button type="button" onClick={() => downloadPolicy(selectedPolicy.text, selectedPolicy.id)}>Download</button>
          </div>
        </div>
        <article className="policy-reading">
          <pre>{selectedPolicy.text}</pre>
        </article>
      </section>
    )
  }

  return (
    <section className="employee-module-section policy-page">
      <div className="employee-module-heading"><div><p>COMPANY DOCUMENTS</p><h1>Company Policies</h1></div></div>
      {error && <p className="employee-error" role="alert">{error}</p>}
      {loading && <p className="employee-loading">Loading published policies…</p>}
      {!loading && !error && policies.length === 0 && (
        <p className="employee-empty">No company policies have been published.</p>
      )}
      {!loading && !error && policies.length > 0 && (
        <div className="policy-card-list">
          {policies.map((policy) => (
            <button
              className="policy-card"
              key={policy.id}
              type="button"
              onClick={() => setSelectedPolicyId(policy.id)}
            >
              <span>{policy.title}</span>
              <Chevron className="dashboard-card__chevron" />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function HolidayPage() {
  const { data, loading, error } = useContent<Holiday[]>(employeeModuleService.holidays, [])
  const [view, setView] = useState<'list' | 'calendar' | 'monthly'>('list')
  const [month, setMonth] = useState(new Date().getMonth())
  const [year, setYear] = useState(new Date().getFullYear())
  const publishedYears = [...new Set(data.flatMap((holiday) => {
    const date = contentDateParts(holiday.date)
    return date ? [date.year] : []
  }))].sort((first, second) => first - second)
  const selectedYear = publishedYears.includes(year) ? year : publishedYears[0] ?? year
  const monthName = new Intl.DateTimeFormat('en-IN', { month: 'long' })
    .format(new Date(selectedYear, month, 1))
  const datedHolidays = data.filter((holiday) => contentDateParts(holiday.date))
  const visibleDatedHolidays = view === 'monthly'
    ? datedHolidays.filter((holiday) => {
      const date = contentDateParts(holiday.date)
      return date?.year === selectedYear && date.month === month
    })
    : datedHolidays
  const undatedHolidays = data.filter((holiday) => !contentDateParts(holiday.date))

  return (
    <section className="employee-module-section">
      <div className="employee-module-heading"><div><p>HR / ADMINISTRATION</p><h1>Holiday List</h1></div></div>
      <div className="holiday-toolbar">
        <div className="holiday-view-switch" role="group" aria-label="Holiday view">
          {(['list', 'calendar', 'monthly'] as const).map((option) => <button type="button" key={option} className={view === option ? 'is-active' : ''} onClick={() => setView(option)}>{option[0].toUpperCase() + option.slice(1)}</button>)}
        </div>
        {view === 'monthly' && <>
          <label>Month<select value={month} onChange={(event) => setMonth(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => <option key={index} value={index}>{new Intl.DateTimeFormat('en-IN', { month: 'long' }).format(new Date(selectedYear, index, 1))}</option>)}</select></label>
          {publishedYears.length > 0 && <label>Year<select value={selectedYear} onChange={(event) => setYear(Number(event.target.value))}>{publishedYears.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>}
        </>}
      </div>
      {error && <p className="employee-error" role="alert">{error}</p>}
      {loading && <p className="employee-loading">Loading holidays…</p>}
      {!loading && data.length === 0 && <p className="holiday-calendar-message">Holiday calendar will be updated by HR / Administration.</p>}
      {!loading && data.length > 0 && view === 'list' && <div className="holiday-list">{data.map((holiday) => <article key={`${holiday.name}-${holiday.date ?? holiday.year ?? 'undated'}`}><h2>{holiday.name}</h2><p>{holiday.date ? displayContentDate(holiday.date) : 'Date not published'}{holiday.year ? ` · ${holiday.year}` : ''}</p></article>)}</div>}
      {!loading && data.length > 0 && view !== 'list' && <div className="holiday-calendar-message">
        <h2>{view === 'monthly' ? `${monthName} ${selectedYear}` : 'Holiday Calendar'}</h2>
        {visibleDatedHolidays.length > 0
          ? <div className="holiday-list">{visibleDatedHolidays.map((holiday) => <article key={`${holiday.name}-${holiday.date}`}><h3>{holiday.name}</h3><p>{holiday.date ? displayContentDate(holiday.date) : 'Date not published'}</p></article>)}</div>
          : <p>No official holiday dates are available for this view. No dates are inferred.</p>}
        {undatedHolidays.length > 0 && <p>Dates are not published for: {undatedHolidays.map((holiday) => holiday.name).join(', ')}</p>}
      </div>}
    </section>
  )
}

export default function EmployeeModuleContent({ module }: { module: ModuleKey }) {
  switch (module) {
    case 'announcements': return <ContentList kind="announcements" />
    case 'thoughts': return <MonthlyThoughtPage />
    case 'notices': return <ContentList kind="notices" />
    case 'meetings': return <MeetingsPage />
    case 'quick-access': return <QuickAccessPage />
    case 'it-support': return <ITSupportPage />
    case 'leave-management': return <LeaveManagementPage />
    case 'policies': return <PolicyPage />
    case 'holidays': return <HolidayPage />
  }
}
