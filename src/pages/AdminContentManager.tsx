import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  deleteManagedContent,
  getAdminDepartments,
  getManagedContent,
  saveManagedContent,
} from '../services/adminService'
import type {
  AdminContentItem,
  AdminContentRequest,
  AdminDepartment,
  ContentStatus,
  ManagedContentCategory,
} from '../types/admin'

interface AdminContentManagerProps {
  category: ManagedContentCategory
  title: string
}

interface ContentForm {
  title: string
  body: string
  scheduledAt: string
  announcementDate: string
  expiresOn: string
  thoughtMonth: string
  department: string
  priority: string
  pinned: boolean
  author: string
  eventDate: string
  time: string
  location: string
  effectiveDate: string
}

const emptyForm: ContentForm = {
  title: '',
  body: '',
  scheduledAt: '',
  announcementDate: '',
  expiresOn: '',
  thoughtMonth: '',
  department: '',
  priority: 'NORMAL',
  pinned: false,
  author: '',
  eventDate: '',
  time: '',
  location: '',
  effectiveDate: '',
}

function localDateTime(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
}

function dateInputValue(value: string | null) {
  return value ?? ''
}

function monthInputValue(value: string | null) {
  return value?.slice(0, 7) ?? ''
}

function displayDate(value: string | null) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString() : ''
}

function displayMonthYear(value: string | null) {
  return value
    ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : ''
}

function formFromItem(item: AdminContentItem): ContentForm {
  return {
    title: item.title,
    body: item.body,
    scheduledAt: localDateTime(item.scheduledAt),
    announcementDate: dateInputValue(item.announcementDate),
    expiresOn: dateInputValue(item.expiresOn),
    thoughtMonth: monthInputValue(item.thoughtMonth),
    department: item.department ?? '',
    priority: item.priority || 'NORMAL',
    pinned: item.pinned,
    author: item.author ?? '',
    eventDate: item.eventDate ?? '',
    time: item.time ?? '',
    location: item.location ?? '',
    effectiveDate: item.effectiveDate ?? '',
  }
}

export default function AdminContentManager({ category, title }: AdminContentManagerProps) {
  const [items, setItems] = useState<AdminContentItem[]>([])
  const [storageConfigured, setStorageConfigured] = useState(false)
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [departmentOptions, setDepartmentOptions] = useState<AdminDepartment[]>([])
  const [departmentOptionsError, setDepartmentOptionsError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<AdminContentItem | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [form, setForm] = useState<ContentForm>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewStatus, setPreviewStatus] = useState<ContentStatus | null>(null)
  const formElement = useRef<HTMLFormElement>(null)

  async function loadItems() {
    setLoading(true)
    setLoadError(null)
    setItems([])
    setStorageConfigured(false)
    setUnavailableMessage(null)
    try {
      const collection = await getManagedContent(category)
      setItems(collection.items)
      setStorageConfigured(collection.storageConfigured)
      setUnavailableMessage(collection.unavailableMessage)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load this content category.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setActionError(null)
    setActionMessage(null)
    setPreviewStatus(null)
    setEditingItem(null)
    setEditorOpen(false)
    setForm({ ...emptyForm })
    setDepartmentOptionsError(null)
    void loadItems()
    if (category === 'announcements' || category === 'notices') {
      setDepartmentOptions([])
      getAdminDepartments()
        .then((collection) => setDepartmentOptions(collection.items))
        .catch((error: unknown) => setDepartmentOptionsError(
          error instanceof Error ? error.message : 'Unable to load department choices.',
        ))
    } else {
      setDepartmentOptions([])
      setDepartmentOptionsError(null)
    }
  }, [category])

  function startNew() {
    setEditingItem(null)
    setForm({ ...emptyForm })
    setEditorOpen(true)
    setActionError(null)
    setActionMessage(null)
    setPreviewStatus(null)
  }

  function startEdit(item: AdminContentItem) {
    setEditingItem(item)
    setForm(formFromItem(item))
    setEditorOpen(true)
    setActionError(null)
    setActionMessage(null)
    setPreviewStatus(null)
  }

  function updateForm<K extends keyof ContentForm>(key: K, value: ContentForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function save(status: ContentStatus) {
    setActionError(null)
    setActionMessage(null)
    if (!formElement.current?.reportValidity()) return
    if (status === 'SCHEDULED' && !form.scheduledAt) {
      setActionError('Choose a future publish date and time before scheduling.')
      return
    }

    let scheduledAt: string | null = null
    if (status === 'SCHEDULED') {
      const date = new Date(form.scheduledAt)
      if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
        setActionError('Choose a future publish date and time before scheduling.')
        return
      }
      scheduledAt = date.toISOString()
    }

    const request: AdminContentRequest = {
      title: form.title.trim(),
      body: form.body.trim(),
      status,
      scheduledAt,
      announcementDate: form.announcementDate || null,
      expiresOn: form.expiresOn || null,
      thoughtMonth: form.thoughtMonth ? `${form.thoughtMonth}-01` : null,
      department: form.department.trim() || null,
      priority: form.priority,
      pinned: form.pinned,
      author: form.author.trim() || null,
      eventDate: form.eventDate || null,
      time: form.time.trim() || null,
      location: form.location.trim() || null,
      effectiveDate: form.effectiveDate || null,
    }

    setSaving(true)
    try {
      await saveManagedContent(category, editingItem?.id ?? null, request)
      setActionMessage(
        status === 'PUBLISHED'
          ? 'Content published.'
          : status === 'SCHEDULED'
            ? 'Content scheduled.'
            : 'Draft saved.',
      )
      setPreviewStatus(null)
      setEditingItem(null)
      setEditorOpen(false)
      setForm({ ...emptyForm })
      await loadItems()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Content could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  function requestSave(status: ContentStatus) {
    setActionError(null)
    if (!formElement.current?.reportValidity()) return
    if (status === 'SCHEDULED') {
      const date = new Date(form.scheduledAt)
      if (!form.scheduledAt || Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
        setActionError('Choose a future publish date and time before scheduling.')
        return
      }
    }
    if (category === 'announcements' && status !== 'DRAFT') {
      setPreviewStatus(status)
      return
    }
    void save(status)
  }

  async function handleDelete(item: AdminContentItem) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return
    setActionError(null)
    setActionMessage(null)
    try {
      await deleteManagedContent(category, item.id)
      setActionMessage('Content deleted.')
      if (editingItem?.id === item.id) {
        setEditingItem(null)
        setEditorOpen(false)
        setPreviewStatus(null)
        setForm({ ...emptyForm })
      }
      await loadItems()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Content could not be deleted.')
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!event.currentTarget.reportValidity()) return
    void save('DRAFT')
  }

  return (
    <section className="admin-content-manager" aria-label={`${title} manager`}>
      {!storageConfigured && unavailableMessage && (
        <p className="admin-state" role="status">{unavailableMessage} No content is shown as saved.</p>
      )}
      {loadError && <p className="admin-state admin-state--error" role="alert">{loadError}</p>}
      {departmentOptionsError && (
        <p className="admin-state admin-state--error" role="alert">{departmentOptionsError}</p>
      )}
      {actionError && <p className="admin-state admin-state--error" role="alert">{actionError}</p>}
      {actionMessage && <p className="admin-state admin-state--success" role="status">{actionMessage}</p>}

      <div className="admin-content-manager__toolbar">
        <p>Create, edit, publish, schedule, or delete {title.toLowerCase()}.</p>
        <button type="button" onClick={startNew} disabled={!storageConfigured || saving}>
          Create content
        </button>
      </div>

      {loading && <p className="admin-state" role="status">Loading saved content…</p>}
      {!loading && !loadError && items.length === 0 && (
        <p className="admin-section-state" role="status">
          {storageConfigured ? `No ${title.toLowerCase()} have been created.` : `No ${title.toLowerCase()} are available while SQL Server is not configured.`}
        </p>
      )}

      {items.length > 0 && (
        <div className="admin-managed-content-list">
          {items.map((item) => (
            <article className="admin-managed-content" key={item.id}>
              <div>
                <span className={`admin-content-status admin-content-status--${item.status.toLowerCase()}`}>
                  {item.status}
                </span>
                <h2>{item.title}</h2>
                <p>{item.body}</p>
                {category === 'announcements' && (
                  <>
                    {item.announcementDate && <small>Announcement date: {displayDate(item.announcementDate)}</small>}
                    {item.expiresOn && <small>Expires: {displayDate(item.expiresOn)}</small>}
                    {item.department && <small>Department: {item.department}</small>}
                    <small>Priority: {item.priority}{item.pinned ? ' · Pinned' : ''}</small>
                  </>
                )}
                {category === 'thoughts' && item.thoughtMonth && <small>Month: {displayMonthYear(item.thoughtMonth)}</small>}
                {item.scheduledAt && <small>Scheduled: {new Date(item.scheduledAt).toLocaleString()}</small>}
              </div>
              <div className="admin-managed-content__actions">
                <button type="button" onClick={() => startEdit(item)}>Edit</button>
                <button type="button" onClick={() => void handleDelete(item)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editorOpen && storageConfigured && (
        <form className="admin-content-form" onSubmit={handleSubmit} ref={formElement}>
          <h2>{editingItem ? `Edit ${title}` : `Create ${title}`}</h2>
          <fieldset disabled={!storageConfigured || saving}>
            <label>
              Title
              <input value={form.title} onChange={(event) => updateForm('title', event.target.value)} required maxLength={250} />
            </label>
            <label>
              {category === 'announcements' ? 'Description' : category === 'thoughts' ? 'Message' : 'Content'}
              <textarea value={form.body} onChange={(event) => updateForm('body', event.target.value)} required rows={6} />
            </label>

            {(category === 'announcements' || category === 'notices') && (
              <div className="admin-content-form__grid">
                <label>
                  Department (optional)
                  {departmentOptionsError ? (
                    <input value={form.department} onChange={(event) => updateForm('department', event.target.value)} maxLength={120} />
                  ) : (
                    <select value={form.department} onChange={(event) => updateForm('department', event.target.value)}>
                      <option value="">Company-wide</option>
                      {form.department && !departmentOptions.some((department) => department.name === form.department) && (
                        <option value={form.department}>{form.department}</option>
                      )}
                      {departmentOptions.map((department) => (
                        <option key={department.id} value={department.name}>{department.name}</option>
                      ))}
                    </select>
                  )}
                </label>
                <label>
                  Priority
                  <select value={form.priority} onChange={(event) => updateForm('priority', event.target.value)}>
                    {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((priority) => <option key={priority}>{priority}</option>)}
                  </select>
                </label>
                <label className="admin-content-form__checkbox">
                  <input type="checkbox" checked={form.pinned} onChange={(event) => updateForm('pinned', event.target.checked)} />
                  Pin this content
                </label>
              </div>
            )}

            {category === 'announcements' && (
              <div className="admin-content-form__grid">
                <label>
                  Announcement date
                  <input
                    type="date"
                    value={form.announcementDate}
                    onChange={(event) => updateForm('announcementDate', event.target.value)}
                    required
                  />
                </label>
                <label>
                  Expiry date
                  <input
                    type="date"
                    value={form.expiresOn}
                    onChange={(event) => updateForm('expiresOn', event.target.value)}
                    required
                  />
                </label>
              </div>
            )}

            {category === 'thoughts' && (
              <div className="admin-content-form__grid">
                <label>
                  Month and year
                  <input
                    type="month"
                    value={form.thoughtMonth}
                    onChange={(event) => updateForm('thoughtMonth', event.target.value)}
                    required
                  />
                </label>
                <label>
                  Author (optional)
                  <input value={form.author} onChange={(event) => updateForm('author', event.target.value)} maxLength={120} />
                </label>
              </div>
            )}

            {category === 'meetings' && (
              <div className="admin-content-form__grid">
                <label>Meeting date<input type="date" value={form.eventDate} onChange={(event) => updateForm('eventDate', event.target.value)} /></label>
                <label>Time<input value={form.time} onChange={(event) => updateForm('time', event.target.value)} maxLength={32} /></label>
                <label className="admin-content-form__wide">Location<input value={form.location} onChange={(event) => updateForm('location', event.target.value)} maxLength={250} /></label>
              </div>
            )}

            {category === 'holidays' && (
              <label>Holiday date<input type="date" value={form.eventDate} onChange={(event) => updateForm('eventDate', event.target.value)} /></label>
            )}

            {category === 'policies' && (
              <label>Effective date<input type="date" value={form.effectiveDate} onChange={(event) => updateForm('effectiveDate', event.target.value)} /></label>
            )}

            <label>
              Schedule publish date and time
              <input type="datetime-local" value={form.scheduledAt} onChange={(event) => updateForm('scheduledAt', event.target.value)} />
            </label>

            {previewStatus && category === 'announcements' && (
              <section className="announcement-preview" aria-label="Announcement preview">
                <div className="announcement-preview__heading">
                  <div>
                    <p>EMPLOYEE VIEW PREVIEW</p>
                    <h3>{previewStatus === 'PUBLISHED' ? 'Ready to publish' : 'Ready to schedule'}</h3>
                  </div>
                  <span>{form.priority}</span>
                </div>
                <div className="announcement-preview__meta">
                  <span>{displayDate(form.announcementDate)}</span>
                  {form.department && <span>{form.department}</span>}
                  {form.pinned && <span>Pinned</span>}
                </div>
                <h4>{form.title}</h4>
                <p>{form.body}</p>
                <small>Expires: {displayDate(form.expiresOn)}</small>
                <div className="admin-content-form__actions">
                  <button type="button" onClick={() => void save(previewStatus)} disabled={saving}>
                    {previewStatus === 'PUBLISHED' ? 'Confirm Publish' : 'Confirm Schedule'}
                  </button>
                  <button
                    className="admin-content-form__cancel"
                    type="button"
                    onClick={() => setPreviewStatus(null)}
                    disabled={saving}
                  >
                    Back to editing
                  </button>
                </div>
              </section>
            )}

            <div className="admin-content-form__actions">
              <button type="submit">{saving ? 'Saving…' : 'Save Draft'}</button>
              <button type="button" onClick={() => requestSave('PUBLISHED')} disabled={saving}>Publish Now</button>
              <button type="button" onClick={() => requestSave('SCHEDULED')} disabled={saving}>Schedule</button>
              <button className="admin-content-form__cancel" type="button" onClick={() => { setEditorOpen(false); setActionError(null); setEditingItem(null); setPreviewStatus(null) }} disabled={saving}>Cancel</button>
            </div>
          </fieldset>
        </form>
      )}
    </section>
  )
}
