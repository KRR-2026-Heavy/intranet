import { useEffect, useState } from 'react'
import Chevron from '../components/Chevron'
import PdfCanvasViewer from '../components/PdfCanvasViewer'
import {
  adminPolicyDocumentFileUrl,
  deleteAdminPolicyDocument,
  getAdminPolicyDocuments,
  replaceAdminPolicyDocumentFile,
  saveAdminPolicyDocument,
  updateAdminPolicyDocumentStatus,
} from '../services/adminService'
import {
  ALLOWED_POLICY_FILE_ACCEPT,
  describePolicyFileType,
  formatPolicyFileSize,
  formatPolicyUpdatedAt,
  POLICY_DOCUMENT_SECTIONS,
  validateSelectedPolicyFile,
  type PolicyDocument,
  type PolicyDocumentSectionKey,
  type PolicyDocumentStatus,
} from '../types/policyDocuments'

interface SectionFormState {
  editing: PolicyDocument | null
  title: string
  description: string
  content: string
  file: File | null
  fileInputKey: number
}

interface PreviewState {
  section: PolicyDocumentSectionKey
  title: string
  fileName: string | null
  mediaType: string | null
  url: string | null
  downloadUrl: string | null
  content: string | null
  isLocalUnsaved: boolean
}

interface ReplaceFileState {
  document: PolicyDocument
  file: File | null
  fileInputKey: number
}

function emptySectionForm(): SectionFormState {
  return {
    editing: null,
    title: '',
    description: '',
    content: '',
    file: null,
    fileInputKey: Date.now(),
  }
}

function guessLocalMediaType(file: File): string {
  if (file.type) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'application/pdf'
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  return 'application/octet-stream'
}

export default function AdminPolicyDocumentManager() {
  const [documents, setDocuments] = useState<PolicyDocument[]>([])
  const [storageConfigured, setStorageConfigured] = useState(false)
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [openSectionForm, setOpenSectionForm] = useState<PolicyDocumentSectionKey | null>(null)
  const [formState, setFormState] = useState<SectionFormState>(emptySectionForm)
  const [savingSection, setSavingSection] = useState<PolicyDocumentSectionKey | null>(null)

  const [replaceState, setReplaceState] = useState<ReplaceFileState | null>(null)
  const [replacingId, setReplacingId] = useState<number | null>(null)

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [busyDocId, setBusyDocId] = useState<number | null>(null)

  const [sectionFeedback, setSectionFeedback] = useState<
    Partial<Record<PolicyDocumentSectionKey, { type: 'error' | 'success'; text: string }>>
  >({})

  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)
  const [replacePreviewUrl, setReplacePreviewUrl] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewState | null>(null)

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

  useEffect(() => {
    void loadDocuments()
  }, [])

  useEffect(() => {
    if (!formState.file) {
      setLocalPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(formState.file)
    setLocalPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [formState.file])

  useEffect(() => {
    if (!replaceState?.file) {
      setReplacePreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(replaceState.file)
    setReplacePreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [replaceState?.file])

  function setFeedback(section: PolicyDocumentSectionKey, type: 'error' | 'success', text: string) {
    setSectionFeedback((current) => ({ ...current, [section]: { type, text } }))
  }

  function clearFeedback(section: PolicyDocumentSectionKey) {
    setSectionFeedback((current) => {
      if (!current[section]) return current
      const next = { ...current }
      delete next[section]
      return next
    })
  }

  function startCreate(section: PolicyDocumentSectionKey) {
    clearFeedback(section)
    setReplaceState(null)
    setConfirmDeleteId(null)
    setPreview(null)
    setFormState(emptySectionForm())
    setOpenSectionForm(section)
  }

  function startEdit(document: PolicyDocument) {
    clearFeedback(document.section)
    setReplaceState(null)
    setConfirmDeleteId(null)
    setPreview(null)
    setFormState({
      editing: document,
      title: document.title,
      description: document.description ?? '',
      content: document.content ?? '',
      file: null,
      fileInputKey: Date.now(),
    })
    setOpenSectionForm(document.section)
  }

  function cancelForm(section: PolicyDocumentSectionKey) {
    setOpenSectionForm(null)
    setFormState(emptySectionForm())
    if (preview?.section === section) setPreview(null)
  }

  function handleFormFileChange(section: PolicyDocumentSectionKey, file: File | null) {
    clearFeedback(section)
    if (!file) {
      setFormState((current) => ({ ...current, file: null }))
      return
    }
    const error = validateSelectedPolicyFile(file)
    if (error) {
      setFeedback(section, 'error', error)
      setFormState((current) => ({ ...current, file: null, fileInputKey: Date.now() }))
      return
    }
    setFormState((current) => ({ ...current, file }))
  }

  function handleReplaceFileChange(document: PolicyDocument, file: File | null) {
    clearFeedback(document.section)
    if (!file) {
      setReplaceState((current) => (current ? { ...current, file: null } : null))
      return
    }
    const error = validateSelectedPolicyFile(file)
    if (error) {
      setFeedback(document.section, 'error', error)
      setReplaceState({ document, file: null, fileInputKey: Date.now() })
      return
    }
    setReplaceState({ document, file, fileInputKey: replaceState?.fileInputKey ?? Date.now() })
  }

  function previewFormFile(section: PolicyDocumentSectionKey) {
    clearFeedback(section)
    if (formState.file && localPreviewUrl) {
      setPreview({
        section,
        title: formState.title.trim() || formState.file.name,
        fileName: formState.file.name,
        mediaType: guessLocalMediaType(formState.file),
        url: localPreviewUrl,
        downloadUrl: localPreviewUrl,
        content: formState.content.trim() || null,
        isLocalUnsaved: true,
      })
      return
    }
    if (formState.editing?.originalFileName) {
      setPreview({
        section,
        title: formState.title.trim() || formState.editing.title,
        fileName: formState.editing.originalFileName,
        mediaType: formState.editing.mediaType,
        url: adminPolicyDocumentFileUrl(formState.editing.id),
        downloadUrl: adminPolicyDocumentFileUrl(formState.editing.id, true),
        content: formState.content.trim() || null,
        isLocalUnsaved: false,
      })
      return
    }
    if (formState.content.trim()) {
      setPreview({
        section,
        title: formState.title.trim() || 'Written content preview',
        fileName: null,
        mediaType: null,
        url: null,
        downloadUrl: null,
        content: formState.content.trim(),
        isLocalUnsaved: true,
      })
      return
    }
    setFeedback(section, 'error', 'Choose a file or enter written content to preview.')
  }

  function previewExistingDocument(document: PolicyDocument) {
    clearFeedback(document.section)
    setPreview({
      section: document.section,
      title: document.title,
      fileName: document.originalFileName,
      mediaType: document.mediaType,
      url: document.originalFileName ? adminPolicyDocumentFileUrl(document.id) : null,
      downloadUrl: document.originalFileName ? adminPolicyDocumentFileUrl(document.id, true) : null,
      content: document.content,
      isLocalUnsaved: false,
    })
  }

  function previewReplacementFile(document: PolicyDocument) {
    clearFeedback(document.section)
    if (!replaceState?.file || !replacePreviewUrl) {
      setFeedback(document.section, 'error', 'Choose a replacement file to preview.')
      return
    }
    setPreview({
      section: document.section,
      title: `${document.title} (Replacement preview)`,
      fileName: replaceState.file.name,
      mediaType: guessLocalMediaType(replaceState.file),
      url: replacePreviewUrl,
      downloadUrl: replacePreviewUrl,
      content: document.content,
      isLocalUnsaved: true,
    })
  }

  async function saveSectionDocument(section: PolicyDocumentSectionKey, status: PolicyDocumentStatus) {
    clearFeedback(section)
    const trimmedTitle = formState.title.trim()
    const trimmedContent = formState.content.trim()
    const hasExistingFile = Boolean(formState.editing?.originalFileName)

    if (!trimmedTitle) {
      setFeedback(section, 'error', 'Enter a document title.')
      return
    }
    if (!formState.file && !trimmedContent && !hasExistingFile) {
      setFeedback(section, 'error', 'Enter written content or choose a file to upload.')
      return
    }
    if (formState.file) {
      const fileError = validateSelectedPolicyFile(formState.file)
      if (fileError) {
        setFeedback(section, 'error', fileError)
        return
      }
    }

    setSavingSection(section)
    try {
      await saveAdminPolicyDocument(formState.editing?.id ?? null, {
        section,
        title: trimmedTitle,
        description: formState.description,
        content: formState.content,
        status,
        file: formState.file,
      })
      setFeedback(
        section,
        'success',
        status === 'PUBLISHED' ? 'Document published.' : 'Document saved as a draft.',
      )
      setOpenSectionForm(null)
      setFormState(emptySectionForm())
      if (preview?.section === section) setPreview(null)
      await loadDocuments()
    } catch (error) {
      setFeedback(section, 'error', error instanceof Error ? error.message : 'Document could not be saved.')
    } finally {
      setSavingSection(null)
    }
  }

  async function submitReplaceFile(document: PolicyDocument) {
    clearFeedback(document.section)
    if (!replaceState?.file) {
      setFeedback(document.section, 'error', 'Choose a new file before saving.')
      return
    }
    const fileError = validateSelectedPolicyFile(replaceState.file)
    if (fileError) {
      setFeedback(document.section, 'error', fileError)
      return
    }
    setReplacingId(document.id)
    try {
      await replaceAdminPolicyDocumentFile(document.id, replaceState.file)
      setFeedback(document.section, 'success', `Replaced file for “${document.title}”.`)
      setReplaceState(null)
      if (preview?.section === document.section) setPreview(null)
      await loadDocuments()
    } catch (error) {
      setFeedback(
        document.section,
        'error',
        error instanceof Error ? error.message : 'File could not be replaced.',
      )
    } finally {
      setReplacingId(null)
    }
  }

  async function togglePublishStatus(document: PolicyDocument) {
    clearFeedback(document.section)
    const nextStatus: PolicyDocumentStatus = document.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
    setBusyDocId(document.id)
    try {
      await updateAdminPolicyDocumentStatus(document.id, nextStatus)
      setFeedback(
        document.section,
        'success',
        nextStatus === 'PUBLISHED'
          ? `“${document.title}” is now published.`
          : `“${document.title}” moved back to draft.`,
      )
      await loadDocuments()
    } catch (error) {
      setFeedback(
        document.section,
        'error',
        error instanceof Error ? error.message : 'Status could not be updated.',
      )
    } finally {
      setBusyDocId(null)
    }
  }

  async function confirmDeleteDocument(document: PolicyDocument) {
    clearFeedback(document.section)
    setBusyDocId(document.id)
    try {
      await deleteAdminPolicyDocument(document.id)
      setConfirmDeleteId(null)
      if (preview?.section === document.section) setPreview(null)
      setFeedback(document.section, 'success', `Deleted “${document.title}”.`)
      await loadDocuments()
    } catch (error) {
      setFeedback(
        document.section,
        'error',
        error instanceof Error ? error.message : 'Document could not be deleted.',
      )
    } finally {
      setBusyDocId(null)
    }
  }

  return (
    <section className="admin-content-manager admin-policy-manager" aria-label="Company policies document manager">
      {!storageConfigured && unavailableMessage && (
        <p className="admin-state" role="status">{unavailableMessage}</p>
      )}
      {loadError && <p className="admin-state admin-state--error" role="alert">{loadError}</p>}
      {loading && <p className="admin-state" role="status">Loading company policy sections…</p>}

      <div className="admin-policy-boxes">
        {POLICY_DOCUMENT_SECTIONS.map((section) => {
          const sectionDocuments = documents.filter((document) => document.section === section.key)
          const publishedCount = sectionDocuments.filter((document) => document.status === 'PUBLISHED').length
          const draftCount = sectionDocuments.length - publishedCount
          const isFormOpen = openSectionForm === section.key
          const isSaving = savingSection === section.key
          const feedback = sectionFeedback[section.key]
          const sectionPreview = preview?.section === section.key ? preview : null

          return (
            <section
              className="admin-policy-box"
              key={section.key}
              aria-labelledby={`policy-box-heading-${section.key}`}
            >
              <header className="admin-policy-box__header">
                <div className="admin-policy-box__title-group">
                  <Chevron className="admin-policy-box__chevron" />
                  <div>
                    <h2 id={`policy-box-heading-${section.key}`}>{section.label}</h2>
                    <p className="admin-policy-box__count">
                      {sectionDocuments.length} {sectionDocuments.length === 1 ? 'document' : 'documents'}
                      {sectionDocuments.length > 0 && ` · ${publishedCount} published · ${draftCount} draft`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => startCreate(section.key)}
                  disabled={!storageConfigured || isSaving}
                >
                  Add document
                </button>
              </header>

              {feedback && (
                <p
                  className={`admin-state ${feedback.type === 'error' ? 'admin-state--error' : 'admin-state--success'}`}
                  role={feedback.type === 'error' ? 'alert' : 'status'}
                >
                  {feedback.text}
                </p>
              )}

              {!loading && sectionDocuments.length === 0 && (
                <p className="admin-policy-box__empty">
                  {storageConfigured
                    ? `No documents added in ${section.label} yet.`
                    : 'Unavailable while SQL Server is not configured.'}
                </p>
              )}

              {sectionDocuments.length > 0 && (
                <div className="admin-managed-content-list">
                  {sectionDocuments.map((document) => {
                    const isReplacing = replaceState?.document.id === document.id
                    const isConfirmingDelete = confirmDeleteId === document.id
                    const isBusy = busyDocId === document.id || replacingId === document.id
                    const fileTypeLabel = describePolicyFileType(document.originalFileName, document.mediaType)
                    const fileSizeLabel = formatPolicyFileSize(document.fileSize)

                    return (
                      <article className="admin-managed-content admin-policy-doc-item" key={document.id}>
                        <div className="admin-policy-doc-item__main">
                          <div className="admin-policy-document__copy">
                            <div className="admin-policy-document__badges">
                              <span className={`admin-content-status admin-content-status--${document.status.toLowerCase()}`}>
                                {document.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                              </span>
                              <span className="admin-policy-type-badge">{fileTypeLabel}</span>
                              {document.content && document.originalFileName && (
                                <span className="admin-policy-type-badge">Written content</span>
                              )}
                            </div>
                            <h3>{document.title}</h3>
                            {document.description && <p>{document.description}</p>}
                            <small>
                              {document.originalFileName
                                ? `${document.originalFileName}${fileSizeLabel ? ` (${fileSizeLabel})` : ''} · `
                                : ''}
                              Last updated: {formatPolicyUpdatedAt(document.updatedAt)}
                            </small>
                          </div>

                          <div className="admin-managed-content__actions admin-policy-document__actions">
                            <button
                              type="button"
                              className="admin-policy-btn-secondary"
                              onClick={() => previewExistingDocument(document)}
                              disabled={isBusy}
                            >
                              Preview
                            </button>
                            <button
                              type="button"
                              onClick={() => startEdit(document)}
                              disabled={isBusy}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="admin-policy-btn-secondary"
                              onClick={() => {
                                clearFeedback(section.key)
                                setOpenSectionForm(null)
                                setConfirmDeleteId(null)
                                setReplaceState(
                                  isReplacing ? null : { document, file: null, fileInputKey: Date.now() },
                                )
                              }}
                              disabled={isBusy}
                            >
                              Replace file
                            </button>
                            <button
                              type="button"
                              onClick={() => void togglePublishStatus(document)}
                              disabled={isBusy}
                            >
                              {document.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                            </button>
                            <button
                              type="button"
                              className="admin-policy-btn-danger"
                              onClick={() => {
                                clearFeedback(section.key)
                                setReplaceState(null)
                                setConfirmDeleteId(isConfirmingDelete ? null : document.id)
                              }}
                              disabled={isBusy}
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {isReplacing && (
                          <div className="admin-policy-inline-panel">
                            <label className="admin-policy-inline-panel__label">
                              Choose replacement file (PDF, Word, Excel, PowerPoint, JPG, PNG · max 20 MB)
                              <input
                                key={replaceState.fileInputKey}
                                type="file"
                                accept={ALLOWED_POLICY_FILE_ACCEPT}
                                onChange={(event) =>
                                  handleReplaceFileChange(document, event.target.files?.[0] ?? null)
                                }
                              />
                            </label>
                            <div className="admin-content-form__actions">
                              <button
                                type="button"
                                className="admin-policy-btn-secondary"
                                onClick={() => previewReplacementFile(document)}
                                disabled={!replaceState.file || replacingId === document.id}
                              >
                                Preview file
                              </button>
                              <button
                                type="button"
                                onClick={() => void submitReplaceFile(document)}
                                disabled={!replaceState.file || replacingId === document.id}
                              >
                                {replacingId === document.id ? 'Replacing…' : 'Save new file'}
                              </button>
                              <button
                                type="button"
                                className="admin-content-form__cancel"
                                onClick={() => setReplaceState(null)}
                                disabled={replacingId === document.id}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {isConfirmingDelete && (
                          <div className="admin-policy-confirm-delete" role="alertdialog" aria-label="Confirm deletion">
                            <p>Delete “{document.title}”? This removes the document and cannot be undone.</p>
                            <div className="admin-content-form__actions">
                              <button
                                type="button"
                                onClick={() => void confirmDeleteDocument(document)}
                                disabled={busyDocId === document.id}
                              >
                                {busyDocId === document.id ? 'Deleting…' : 'Confirm delete'}
                              </button>
                              <button
                                type="button"
                                className="admin-content-form__cancel"
                                onClick={() => setConfirmDeleteId(null)}
                                disabled={busyDocId === document.id}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </article>
                    )
                  })}
                </div>
              )}

              {isFormOpen && storageConfigured && (
                <form
                  className="admin-content-form admin-policy-box__form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void saveSectionDocument(section.key, formState.editing?.status ?? 'DRAFT')
                  }}
                >
                  <h3>
                    {formState.editing
                      ? `Edit in ${section.label}: ${formState.editing.title}`
                      : `Add document to ${section.label}`}
                  </h3>
                  <fieldset disabled={isSaving}>
                    <label>
                      Title
                      <input
                        value={formState.title}
                        onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
                        required
                        maxLength={250}
                        placeholder="Enter document title"
                      />
                    </label>
                    <label>
                      Description (optional)
                      <textarea
                        value={formState.description}
                        onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
                        rows={2}
                        maxLength={2000}
                        placeholder="Short summary for employees"
                      />
                    </label>
                    <label>
                      Written content (optional if uploading a file)
                      <textarea
                        value={formState.content}
                        onChange={(event) => setFormState((current) => ({ ...current, content: event.target.value }))}
                        rows={5}
                        placeholder="Type the policy text, instructions, or committee details directly here"
                      />
                    </label>
                    <label>
                      {formState.editing ? 'File upload (choose only to replace current file)' : 'File upload (PDF, Word, Excel, PowerPoint, JPG, PNG)'}
                      <input
                        key={formState.fileInputKey}
                        type="file"
                        accept={ALLOWED_POLICY_FILE_ACCEPT}
                        onChange={(event) => handleFormFileChange(section.key, event.target.files?.[0] ?? null)}
                      />
                    </label>
                    <p className="admin-policy-current-file">
                      Allowed types: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, JPG, PNG (max 20 MB).
                      {formState.editing?.originalFileName && (
                        <> Current file: <strong>{formState.editing.originalFileName}</strong>.</>
                      )}
                    </p>
                  </fieldset>

                  <div className="admin-content-form__actions">
                    <button
                      type="button"
                      className="admin-policy-btn-secondary"
                      onClick={() => previewFormFile(section.key)}
                      disabled={isSaving}
                    >
                      Preview file
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveSectionDocument(section.key, 'DRAFT')}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving…' : 'Save draft'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveSectionDocument(section.key, 'PUBLISHED')}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving…' : 'Publish'}
                    </button>
                    <button
                      type="button"
                      className="admin-content-form__cancel"
                      onClick={() => cancelForm(section.key)}
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {sectionPreview && (
                <section className="admin-policy-preview" aria-label={`Preview ${sectionPreview.title}`}>
                  <div className="admin-policy-preview__header">
                    <strong>
                      Preview: {sectionPreview.title}
                      {sectionPreview.fileName ? ` (${sectionPreview.fileName})` : ''}
                    </strong>
                    <div className="admin-content-form__actions">
                      {sectionPreview.downloadUrl && !sectionPreview.isLocalUnsaved && (
                        <a className="admin-policy-preview__download" href={sectionPreview.downloadUrl}>
                          Download
                        </a>
                      )}
                      {sectionPreview.mediaType !== 'application/pdf' && (
                        <button type="button" onClick={() => setPreview(null)}>
                          Close preview
                        </button>
                      )}
                    </div>
                  </div>

                  {sectionPreview.content && (
                    <div className="admin-policy-preview__written">
                      <h4>Written content</h4>
                      <p>{sectionPreview.content}</p>
                    </div>
                  )}

                  {sectionPreview.url && sectionPreview.mediaType?.startsWith('image/') && (
                    <img src={sectionPreview.url} alt={sectionPreview.fileName ?? sectionPreview.title} />
                  )}

                  {sectionPreview.url && sectionPreview.mediaType === 'application/pdf' && (
                    <PdfCanvasViewer
                      sourceUrl={sectionPreview.url}
                      downloadUrl={sectionPreview.downloadUrl ?? sectionPreview.url}
                      fileName={sectionPreview.fileName ?? `${sectionPreview.title}.pdf`}
                      onClose={() => setPreview(null)}
                    />
                  )}

                  {sectionPreview.url &&
                    sectionPreview.mediaType &&
                    !sectionPreview.mediaType.startsWith('image/') &&
                    sectionPreview.mediaType !== 'application/pdf' && (
                      <p>
                        {sectionPreview.isLocalUnsaved
                          ? `Selected ${describePolicyFileType(sectionPreview.fileName, sectionPreview.mediaType)} file (${sectionPreview.fileName}) is ready to upload. Word, Excel, and PowerPoint files open in their desktop app after saving.`
                          : (
                            <>
                              This {describePolicyFileType(sectionPreview.fileName, sectionPreview.mediaType)} file opens in its desktop application.{' '}
                              <a href={sectionPreview.downloadUrl ?? sectionPreview.url}>
                                Download {sectionPreview.fileName}
                              </a>
                            </>
                          )}
                      </p>
                    )}
                </section>
              )}
            </section>
          )
        })}
      </div>
    </section>
  )
}
