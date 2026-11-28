import { Fragment, useEffect, useMemo, useState } from 'react'
import Chevron from './Chevron'
import DashboardIcon from './DashboardIcon'
import PdfCanvasViewer from './PdfCanvasViewer'
import { employeeModuleService } from '../services/employeeModuleService'
import type {
  Holiday,
  Meeting,
  MonthlyThought,
  PublishedContent,
} from '../types/employeeModules'
import type { EmployeeThirukkural } from '../types/thirukkural'
import {
  describePolicyFileType,
  formatPolicyFileSize,
  formatPolicyUpdatedAt,
  POLICY_DOCUMENT_SECTIONS,
  type PolicyDocument,
  type PolicyDocumentSectionKey,
} from '../types/policyDocuments'

export type ModuleKey =
  | 'announcements'
  | 'thoughts'
  | 'notices'
  | 'meetings'
  | 'quick-access'
  | 'it-support'
  | 'policies'
  | 'holidays'



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

function useContent<T>(loader: () => Promise<T>, initial: T, refreshMs?: number) {
  const [data, setData] = useState<T>(initial)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const refresh = () => loader()
      .then((result) => { if (active) setData(result) })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load this information.')
      })
      .finally(() => { if (active) setLoading(false) })
    void refresh()
    const timer = refreshMs ? window.setInterval(() => { void refresh() }, refreshMs) : undefined
    return () => {
      active = false
      if (timer) window.clearInterval(timer)
    }
  }, [loader, refreshMs])

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
  const thirukkural = useContent<EmployeeThirukkural | null>(employeeModuleService.thirukkural, null, 60_000)
  return (
    <section className="thoughts-page">
      <p className="thoughts-page__eyebrow">A MOMENT OF INSPIRATION</p>
      <h1>THOUGHTS FOR THE MONTH</h1>
      {(error || thirukkural.error) && <p className="employee-error" role="alert">{error ?? thirukkural.error}</p>}
      {loading || thirukkural.loading ? <p className="employee-loading">Loading this month's thought…</p> : thirukkural.data ? (
        <article className="thought-card">
          <span>KURAL {thirukkural.data.kuralNumber} / 10</span>
          <p className="thirukkural-couplet" lang="ta" dir="auto">{thirukkural.data.line1}{'\n'}{thirukkural.data.line2}</p>
        </article>
      ) : data ? (
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

interface IntercomEntry {
  sno: number
  role: string
  extension: string
}

interface DepartmentDirectory {
  department: string
  entries: IntercomEntry[]
}

const intercomDirectory: DepartmentDirectory[] = [
  {
    department: 'Management',
    entries: [
      { sno: 1, role: 'MD - Dr. Sakthivel Ramaswamy', extension: '100' },
      { sno: 2, role: 'VP - Mr. B Prakash', extension: '101' },
      { sno: 3, role: 'AVP - Mr. S Karthikesan', extension: '102' },
      { sno: 4, role: 'CAO - Mr. R Ganesh', extension: '103' },
    ],
  },
  {
    department: 'Admin',
    entries: [
      { sno: 1, role: 'Secretary - VP / AVP', extension: '270' },
      { sno: 2, role: 'Security (Main building)', extension: '220' },
      { sno: 3, role: 'Pantry (Main building)', extension: '250' },
      { sno: 4, role: 'Meeting Room (RM-1)', extension: '260' },
    ],
  },
  {
    department: 'Systems development',
    entries: [
      { sno: 1, role: 'Head Systems development - Mr. K Suresh', extension: '300' },
      { sno: 2, role: 'IT Team', extension: '301' },
      { sno: 3, role: 'QMS Team', extension: '310' },
    ],
  },
  {
    department: 'Business Development',
    entries: [
      { sno: 1, role: 'Business Development Team', extension: '432' },
    ],
  },
  {
    department: 'Sales & Proposal',
    entries: [
      { sno: 1, role: 'Head Sales and proposal - Mr.R Sathish kumar', extension: '400' },
      { sno: 2, role: 'Proposal Team', extension: '401 / 402' },
      { sno: 3, role: 'Sales - Mrs. R Rajeswari', extension: '421' },
    ],
  },
  {
    department: 'Design',
    entries: [
      { sno: 1, role: 'Head Design (GE) - Mr. S Marimuthu', extension: '500' },
      { sno: 2, role: 'Design Team 1 - GE', extension: '501' },
      { sno: 3, role: 'Design Team 2 - GE', extension: '502' },
    ],
  },
  {
    department: 'Project',
    entries: [
      { sno: 1, role: 'Head Project (GE) - Mr. G Karthik', extension: '600' },
      { sno: 2, role: 'Project Team - GE', extension: '601' },
      { sno: 3, role: 'Head Project (Site) - Mr. J Senthil Kumar', extension: '611' },
      { sno: 4, role: 'Project Team - Site', extension: '612' },
    ],
  },
  {
    department: 'Planning',
    entries: [
      { sno: 1, role: 'Head Planning (GE) - Mr.K Vinoth', extension: '700' },
      { sno: 2, role: 'Planning Team - GE', extension: '701' },
      { sno: 3, role: 'Out sourcing (GE) - Mr. M Mohamed faizudeen', extension: '711' },
    ],
  },
]

function QuickAccessPage() {
  const [search, setSearch] = useState('')

  const filteredDirectory = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return intercomDirectory

    return intercomDirectory
      .map((dept) => {
        const matchesDept = dept.department.toLowerCase().includes(q)
        if (matchesDept) return dept

        const matchedEntries = dept.entries.filter(
          (entry) =>
            entry.role.toLowerCase().includes(q) ||
            entry.extension.toLowerCase().includes(q),
        )

        return matchedEntries.length > 0
          ? { ...dept, entries: matchedEntries }
          : null
      })
      .filter((dept): dept is DepartmentDirectory => dept !== null)
  }, [search])

  return (
    <section className="employee-module-section quick-access-page">
      <div className="employee-module-heading quick-access-heading">
        <div>
          <p>EMPLOYEE RESOURCES</p>
          <h1>INTERCOM EXTENSION NUMBERS</h1>
        </div>
        <div className="employee-module-filters">
          <label className="employee-filter">
            <span className="sr-only">Search intercom directory</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, role, extension..."
            />
          </label>
        </div>
      </div>

      <div className="intercom-directory-card">
        <div className="intercom-directory-card__top">
          <div className="intercom-directory-badge">Main Building</div>
          <p className="intercom-directory-hint">
            Direct internal intercom extension numbers for departments and teams.
          </p>
        </div>

        {filteredDirectory.length === 0 ? (
          <div className="employee-empty">
            No intercom extensions match &ldquo;{search}&rdquo;.
          </div>
        ) : (
          <div className="intercom-table-container">
            <table className="intercom-table">
              <thead>
                <tr>
                  <th className="intercom-col-sno">#</th>
                  <th className="intercom-col-name">Name / Designation / Team</th>
                  <th className="intercom-col-ext">Intercom Ext.</th>
                </tr>
              </thead>
              <tbody>
                {filteredDirectory.map((dept) => (
                  <Fragment key={dept.department}>
                    <tr className="intercom-dept-header">
                      <td colSpan={3}>
                        <div className="intercom-dept-title">
                          <span>{dept.department}</span>
                        </div>
                      </td>
                    </tr>
                    {dept.entries.map((entry) => (
                      <tr
                        key={`${dept.department}-${entry.sno}-${entry.extension}`}
                        className="intercom-entry-row"
                      >
                        <td className="intercom-col-sno">{entry.sno}</td>
                        <td className="intercom-col-name">{entry.role}</td>
                        <td className="intercom-col-ext">
                          <span className="intercom-ext-badge">{entry.extension}</span>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

function ITSupportPage() {
  return (
    <section className="employee-module-section">
      <div className="employee-module-heading"><div><p>HELP DESK</p><h1>IT Support</h1></div></div>
      <div className="it-support-options">
        <article className="employee-content-card it-support-card">
          <DashboardIcon type="support" className="it-support-card__icon" />
          <div><h2>Submit an IT support request</h2>
            <p>Use the official KRR Engineering IT support form to report an issue or request assistance.</p>
            <a className="employee-primary-button" href="https://forms.gle/mcFYyvpKhGbsvtBJ8" target="_blank" rel="noopener noreferrer">
              Open IT Support Form <Chevron className="employee-primary-button__chevron" />
            </a>
          </div>
        </article>
        <article className="employee-content-card it-support-card">
          <DashboardIcon type="support" className="it-support-card__icon" />
          <div><h2>SAP Related Complaints</h2>
            <p>Use the SAP support portal to submit or follow up on SAP-related complaints.</p>
            <a className="employee-primary-button" href="https://group-ea.freshdesk.com/support/login" target="_blank" rel="noopener noreferrer">
              Open SAP Support <Chevron className="employee-primary-button__chevron" />
            </a>
          </div>
        </article>
      </div>
    </section>
  )
}

function PolicyPage() {
  const { data, loading, error } = useContent(employeeModuleService.policyDocuments, {
    storageConfigured: false,
    items: [],
    unavailableMessage: null,
  })
  const [activeSection, setActiveSection] = useState<PolicyDocumentSectionKey>('policies')
  const [previewId, setPreviewId] = useState<number | null>(null)
  const section = POLICY_DOCUMENT_SECTIONS.find((item) => item.key === activeSection)!
  const sectionDocuments = data.items.filter((document) => document.section === activeSection)
  const previewDocument = sectionDocuments.find((document) => document.id === previewId)

  return (
    <section className="employee-module-section policy-page">
      <div className="employee-module-heading"><div><p>COMPANY DOCUMENTS</p><h1>Company Policies</h1></div></div>
      {error && <p className="employee-error" role="alert">{error}</p>}
      {loading && <p className="employee-loading">Loading published policies…</p>}
      {data.unavailableMessage && <p className="employee-state" role="status">{data.unavailableMessage}</p>}
      {!loading && !error && (
        <>
          <nav className="policy-section-menu" aria-label="Company policy sections">
            {POLICY_DOCUMENT_SECTIONS.map((item) => (
              <button
                className={`policy-section-menu__item${activeSection === item.key ? ' is-active' : ''}`}
                key={item.key}
                type="button"
                onClick={() => { setActiveSection(item.key); setPreviewId(null) }}
                aria-pressed={activeSection === item.key}
              >
                <span>{item.label}</span>
                <span className="policy-section-menu__count">
                  {data.items.filter((document) => document.section === item.key).length}
                </span>
              </button>
            ))}
          </nav>

          <section className="policy-document-section" aria-labelledby="policy-document-section-title">
            <h2 id="policy-document-section-title">{section.label}</h2>
            {sectionDocuments.length === 0 ? (
              <p className="employee-empty">No documents have been published in this section.</p>
            ) : (
              <div className="policy-document-list">
                {sectionDocuments.map((document: PolicyDocument) => {
                  const fileTypeLabel = describePolicyFileType(document.originalFileName, document.mediaType)
                  const fileSizeLabel = formatPolicyFileSize(document.fileSize)
                  return (
                    <article className="policy-document-card" key={document.id}>
                      <div className="policy-document-card__copy">
                        <div className="policy-document-card__meta">
                          <span className="policy-document-type">{fileTypeLabel}</span>
                          {document.content && document.originalFileName && (
                            <span className="policy-document-type">Written content</span>
                          )}
                        </div>
                        <h3>{document.title}</h3>
                        {document.description && <p>{document.description}</p>}
                        <small>
                          {document.originalFileName
                            ? `${document.originalFileName}${fileSizeLabel ? ` · ${fileSizeLabel}` : ''} · `
                            : ''}
                          Updated {formatPolicyUpdatedAt(document.updatedAt)}
                        </small>
                      </div>
                      <div className="policy-document-card__actions">
                        <button
                          type="button"
                          onClick={() => setPreviewId(previewId === document.id ? null : document.id)}
                          aria-pressed={previewId === document.id}
                        >
                          {previewId === document.id ? 'Close preview' : 'View'}
                        </button>
                        {document.originalFileName && (
                          <a href={employeeModuleService.policyDocumentFileUrl(document.id, true)}>Download</a>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}

            {previewDocument && (
              <div className="policy-document-preview">
                <div className="policy-document-preview__header">
                  <h3>{previewDocument.title}</h3>
                  <button type="button" onClick={() => setPreviewId(null)}>Close</button>
                </div>
                {previewDocument.content && (
                  <div className="policy-document-preview__content">
                    <p>{previewDocument.content}</p>
                  </div>
                )}
                {previewDocument.originalFileName && (
                  previewDocument.mediaType?.startsWith('image/') ? (
                    <img src={employeeModuleService.policyDocumentFileUrl(previewDocument.id)} alt={previewDocument.title} />
                  ) : previewDocument.mediaType === 'application/pdf' ? (
                    <PdfCanvasViewer
                      sourceUrl={employeeModuleService.policyDocumentFileUrl(previewDocument.id)}
                      downloadUrl={employeeModuleService.policyDocumentFileUrl(previewDocument.id, true)}
                      fileName={previewDocument.originalFileName}
                      onClose={() => setPreviewId(null)}
                    />
                  ) : (
                    <p>
                      This {describePolicyFileType(previewDocument.originalFileName, previewDocument.mediaType)} file opens in its associated application.{' '}
                      <a href={employeeModuleService.policyDocumentFileUrl(previewDocument.id, true)}>
                        Download {previewDocument.originalFileName}
                      </a>
                    </p>
                  )
                )}
              </div>
            )}
          </section>
        </>
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
    case 'policies': return <PolicyPage />
    case 'holidays': return <HolidayPage />
  }
}
