import { useEffect, useState, type FormEvent } from 'react'
import PdfCanvasViewer from '../components/PdfCanvasViewer'
import {
  adminPolicyDocumentFileUrl,
  deleteAdminPolicyDocument,
  getAdminPolicyDocuments,
  saveAdminPolicyDocument,
  type PolicyDocumentFormData,
} from '../services/adminService'
import {
  POLICY_DOCUMENT_SECTIONS,
  type PolicyDocument,
  type PolicyDocumentSectionKey,
  type PolicyDocumentStatus,
} from '../types/policyDocuments'

const emptyForm: PolicyDocumentFormData = {
  section: 'policies',
  title: '',
  description: '',
  status: 'DRAFT',
  file: null,
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export default function AdminPolicyDocumentManager() {
  const [documents, setDocuments] = useState<PolicyDocument[]>([])
  const [storageConfigured, setStorageConfigured] = useState(false)
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [editing, setEditing] = useState<PolicyDocument | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<PolicyDocumentFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ url: string; downloadUrl: string; name: string; mediaType: string } | null>(null)

  async function loadDocuments() {
    setLoading(true)
    setLoadError(null)
    try {
      const collection = await getAdminPolicyDocuments()
      setDocuments(collection.items)
      setStorageConfigured(collection.storageConfigured)
      setUnavailableMessage(collection.unavailableMessage)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load policy documents.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadDocuments() }, [])

  useEffect(() => {
    if (!form.file) {
      setLocalPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(form.file)
    setLocalPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [form.file])

  function startCreate() {
    setEditing(null)
    setForm({ ...emptyForm })
    setPreview(null)
    setActionError(null)
    setActionMessage(null)
    setFormOpen(true)
  }

  function startEdit(document: PolicyDocument) {
    setEditing(document)
    setForm({
      section: document.section,
      title: document.title,
      description: document.description ?? '',
      status: document.status,
      file: null,
    })
    setPreview(null)
    setActionError(null)
    setActionMessage(null)
    setFormOpen(true)
  }

  function updateForm<K extends keyof PolicyDocumentFormData>(key: K, value: PolicyDocumentFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function previewExisting(document: PolicyDocument) {
    setPreview({
      url: adminPolicyDocumentFileUrl(document.id),
      downloadUrl: adminPolicyDocumentFileUrl(document.id, true),
      name: document.originalFileName,
      mediaType: document.mediaType,
    })
  }

  function previewFormFile() {
    if (form.file && localPreviewUrl) {
      const mediaType = form.file.type || ''
      const extension = form.file.name.split('.').pop()?.toLowerCase()
      const fallbackType = extension === 'pdf' ? 'application/pdf'
        : ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension ?? '') ? `image/${extension === 'jpg' ? 'jpeg' : extension}`
          : 'application/octet-stream'
      setPreview({ url: localPreviewUrl, downloadUrl: localPreviewUrl, name: form.file.name, mediaType: mediaType || fallbackType })
    } else if (editing) {
      setPreview({
        url: adminPolicyDocumentFileUrl(editing.id),
        downloadUrl: adminPolicyDocumentFileUrl(editing.id, true),
        name: editing.originalFileName,
        mediaType: editing.mediaType,
      })
    } else {
      setActionError('Choose a file to preview before saving this document.')
    }
  }

  async function saveDocument(status: PolicyDocumentStatus) {
    setActionError(null)
    setActionMessage(null)
    if (!form.title.trim()) {
      setActionError('Enter a document title.')
      return
    }
    if (!editing && !form.file) {
      setActionError('Choose a file before saving this document.')
      return
    }
    setSaving(true)
    try {
      await saveAdminPolicyDocument(editing?.id ?? null, { ...form, status })
      setActionMessage(status === 'PUBLISHED' ? 'Policy document published.' : 'Policy document saved as a draft.')
      setFormOpen(false)
      setEditing(null)
      setForm({ ...emptyForm })
      setPreview(null)
      await loadDocuments()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Policy document could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  async function removeDocument(document: PolicyDocument) {
    if (!window.confirm(`Delete “${document.title}”? This cannot be undone.`)) return
    setActionError(null)
    setActionMessage(null)
    try {
      await deleteAdminPolicyDocument(document.id)
      setActionMessage('Policy document deleted.')
      if (preview?.url === adminPolicyDocumentFileUrl(document.id)) setPreview(null)
      await loadDocuments()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Policy document could not be deleted.')
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void saveDocument(form.status)
  }

  return (
    <section className="admin-content-manager admin-policy-manager" aria-label="Company policies document manager">
      {!storageConfigured && unavailableMessage && <p className="admin-state" role="status">{unavailableMessage}</p>}
      {loadError && <p className="admin-state admin-state--error" role="alert">{loadError}</p>}
      {actionError && <p className="admin-state admin-state--error" role="alert">{actionError}</p>}
      {actionMessage && <p className="admin-state admin-state--success" role="status">{actionMessage}</p>}

      <div className="admin-content-manager__toolbar">
        <p>Upload and publish policy documents in the matching employee section.</p>
        <button type="button" onClick={startCreate} disabled={!storageConfigured || saving}>Add document</button>
      </div>

      {loading && <p className="admin-state" role="status">Loading policy documents…</p>}
      {!loading && documents.length === 0 && !loadError && (
        <p className="admin-section-state" role="status">
          {storageConfigured ? 'No policy documents have been added.' : 'Policy documents are unavailable while SQL Server is not configured.'}
        </p>
      )}

      {documents.length > 0 && (
        <div className="admin-managed-content-list">
          {documents.map((document) => {
            const section = POLICY_DOCUMENT_SECTIONS.find((item) => item.key === document.section)
            return (
              <article className="admin-managed-content" key={document.id}>
                <div className="admin-policy-document__copy">
                  <span className={`admin-content-status admin-content-status--${document.status.toLowerCase()}`}>
                    {document.status}
                  </span>
                  <small>{section?.label ?? document.section} · {formatFileSize(document.fileSize)}</small>
                  <h2>{document.title}</h2>
                  {document.description && <p>{document.description}</p>}
                  <small>{document.originalFileName}</small>
                </div>
                <div className="admin-managed-content__actions admin-policy-document__actions">
                  <button type="button" onClick={() => previewExisting(document)}>Preview</button>
                  <a href={adminPolicyDocumentFileUrl(document.id, true)}>Download</a>
                  <button type="button" onClick={() => startEdit(document)}>Edit</button>
                  <button type="button" onClick={() => void removeDocument(document)}>Delete</button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {formOpen && storageConfigured && (
        <form className="admin-content-form" onSubmit={handleSubmit}>
          <h2>{editing ? `Edit ${editing.title}` : 'Add policy document'}</h2>
          <fieldset disabled={saving}>
            <label>
              Section
              <select value={form.section} onChange={(event) => updateForm('section', event.target.value as PolicyDocumentSectionKey)}>
                {POLICY_DOCUMENT_SECTIONS.map((section) => <option key={section.key} value={section.key}>{section.label}</option>)}
              </select>
            </label>
            <label>
              Document title
              <input value={form.title} onChange={(event) => updateForm('title', event.target.value)} required maxLength={250} />
            </label>
            <label>
              Description (optional)
              <textarea value={form.description} onChange={(event) => updateForm('description', event.target.value)} rows={3} maxLength={2000} />
            </label>
            <label>
              {editing ? 'Replace file (optional)' : 'Document file'}
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf"
                required={!editing}
                onChange={(event) => updateForm('file', event.target.files?.[0] ?? null)}
              />
            </label>
            {editing && <p className="admin-policy-current-file">Current file: {editing.originalFileName}. Choose a replacement only when you need to replace it.</p>}
            <label>
              Visibility
              <select value={form.status} onChange={(event) => updateForm('status', event.target.value as PolicyDocumentStatus)}>
                <option value="DRAFT">Draft (admin only)</option>
                <option value="PUBLISHED">Published (visible to employees)</option>
              </select>
            </label>
          </fieldset>
          <div className="admin-content-form__actions">
            <button type="button" onClick={previewFormFile}>Preview file</button>
            <button type="button" onClick={() => void saveDocument('DRAFT')} disabled={saving}>
              {saving ? 'Saving…' : 'Save draft'}
            </button>
            <button type="button" onClick={() => void saveDocument('PUBLISHED')} disabled={saving}>
              {saving ? 'Saving…' : 'Publish'}
            </button>
            <button type="button" className="admin-content-form__cancel" onClick={() => { setFormOpen(false); setPreview(null) }} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {preview && (
        <section className="admin-policy-preview" aria-label={`Preview ${preview.name}`}>
          <div className="admin-policy-preview__header">
            <strong>Preview: {preview.name}</strong>
            {preview.mediaType !== 'application/pdf' && (
              <button type="button" onClick={() => setPreview(null)}>Close preview</button>
            )}
          </div>
          {preview.mediaType.startsWith('image/') ? (
            <img src={preview.url} alt={preview.name} />
          ) : preview.mediaType === 'application/pdf' ? (
            <PdfCanvasViewer
              sourceUrl={preview.url}
              downloadUrl={preview.downloadUrl}
              fileName={preview.name}
              onClose={() => setPreview(null)}
            />
          ) : (
            <p>This file type is downloaded for review. <a href={preview.url} download={preview.name}>Download {preview.name}</a></p>
          )}
        </section>
      )}
    </section>
  )
}
