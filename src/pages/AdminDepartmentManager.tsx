import { useEffect, useState } from 'react'
import { getAdminDepartments, saveAdminDepartmentOverview } from '../services/adminService'
import type { AdminDepartment, AdminDepartmentCollection } from '../types/admin'

export default function AdminDepartmentManager() {
  const [collection, setCollection] = useState<AdminDepartmentCollection | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [overview, setOverview] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setLoadError(null)
    try {
      setCollection(await getAdminDepartments())
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load department records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function startEdit(department: AdminDepartment) {
    setEditingId(department.id)
    setOverview(department.overview.startsWith('Department overview has not been published.')
      ? ''
      : department.overview)
    setActionError(null)
    setMessage(null)
  }

  async function save(departmentId: string) {
    setSavingId(departmentId)
    setActionError(null)
    setMessage(null)
    try {
      const updated = await saveAdminDepartmentOverview(departmentId, overview)
      setCollection((current) => current && ({
        ...current,
        items: current.items.map((department) => department.id === updated.id ? updated : department),
      }))
      setEditingId(null)
      setMessage('Department overview saved.')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Department overview could not be saved.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <section className="admin-content-manager" aria-label="Department management">
      {!collection?.storageConfigured && collection?.unavailableMessage && (
        <p className="admin-state" role="status">{collection.unavailableMessage}</p>
      )}
      {loadError && <p className="admin-state admin-state--error" role="alert">{loadError}</p>}
      {actionError && <p className="admin-state admin-state--error" role="alert">{actionError}</p>}
      {message && <p className="admin-state admin-state--success" role="status">{message}</p>}
      <div className="admin-content-manager__toolbar">
        <p>Edit department overviews and review active employee assignment counts. The supplied 16 departments remain fixed.</p>
        <button type="button" onClick={() => void load()} disabled={loading || savingId !== null}>Refresh</button>
      </div>
      {loading && <p className="admin-state" role="status">Loading departments…</p>}
      {!loading && collection && (
        <div className="admin-managed-content-list">
          {collection.items.map((department) => (
            <article className="admin-managed-content" key={department.id}>
              <div className="admin-department-manager__content">
                <h2>{department.name}</h2>
                <small>{department.activeEmployees} active employee records</small>
                {editingId === department.id ? (
                  <label className="admin-content-form__label">
                    Department overview
                    <textarea
                      value={overview}
                      onChange={(event) => setOverview(event.target.value)}
                      maxLength={2000}
                      rows={4}
                    />
                  </label>
                ) : (
                  <p>{department.overview}</p>
                )}
              </div>
              {collection.storageConfigured && (
                <div className="admin-managed-content__actions">
                  {editingId === department.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void save(department.id)}
                        disabled={savingId === department.id}
                      >
                        {savingId === department.id ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        disabled={savingId === department.id}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => startEdit(department)}>Edit overview</button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
