import { useEffect, useState, type FormEvent } from 'react'
import {
  deactivateAdminEmployee,
  getAdminDepartments,
  getAdminEmployees,
  saveAdminEmployee,
} from '../services/adminService'
import type {
  AdminDepartment,
  AdminEmployeeCollection,
  AdminEmployeeProfile,
  AdminEmployeeRequest,
} from '../types/admin'

const emptyForm: AdminEmployeeRequest = {
  employeeCode: '',
  fullName: '',
  jobTitle: '',
  departmentId: '',
  active: true,
  departmentHead: false,
}

export default function AdminEmployeeManager() {
  const [collection, setCollection] = useState<AdminEmployeeCollection | null>(null)
  const [departments, setDepartments] = useState<AdminDepartment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [editingEmployee, setEditingEmployee] = useState<AdminEmployeeProfile | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<AdminEmployeeRequest>(emptyForm)

  async function load() {
    setLoading(true)
    setLoadError(null)
    try {
      const [employees, departmentCollection] = await Promise.all([
        getAdminEmployees(),
        getAdminDepartments(),
      ])
      setCollection(employees)
      setDepartments(departmentCollection.items)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load employee management.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function startNew() {
    setEditingEmployee(null)
    setForm({
      ...emptyForm,
      departmentId: departments[0]?.id ?? '',
    })
    setFormOpen(true)
    setActionError(null)
    setMessage(null)
  }

  function startEdit(employee: AdminEmployeeProfile) {
    setEditingEmployee(employee)
    setForm({
      employeeCode: employee.employeeCode,
      fullName: employee.fullName,
      jobTitle: employee.jobTitle,
      departmentId: employee.departmentId,
      active: employee.active,
      departmentHead: employee.departmentHead,
    })
    setFormOpen(true)
    setActionError(null)
    setMessage(null)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setActionError(null)
    setMessage(null)
    try {
      await saveAdminEmployee(editingEmployee?.id ?? null, form)
      setFormOpen(false)
      setEditingEmployee(null)
      setForm({ ...emptyForm })
      setMessage('Employee record saved.')
      await load()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Employee record could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  async function deactivate(employee: AdminEmployeeProfile) {
    const action = employee.active ? 'Deactivate' : 'Reactivate'
    setActionError(null)
    setMessage(null)
    try {
      if (employee.active) {
        const confirmed = window.confirm(`Deactivate ${employee.fullName}? The record will be retained.`)
        if (!confirmed) return
        await deactivateAdminEmployee(employee.id)
      } else {
        await saveAdminEmployee(employee.id, {
          employeeCode: employee.employeeCode,
          fullName: employee.fullName,
          jobTitle: employee.jobTitle,
          departmentId: employee.departmentId,
          active: true,
          departmentHead: employee.departmentHead,
        })
      }
      setMessage(`Employee record ${action.toLowerCase()}d.`)
      await load()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : `Employee could not be ${action.toLowerCase()}d.`)
    }
  }

  function updateForm<K extends keyof AdminEmployeeRequest>(
    key: K,
    value: AdminEmployeeRequest[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  return (
    <section className="admin-content-manager" aria-label="Employee management">
      {!collection?.storageConfigured && collection?.unavailableMessage && (
        <p className="admin-state" role="status">{collection.unavailableMessage}</p>
      )}
      {loadError && <p className="admin-state admin-state--error" role="alert">{loadError}</p>}
      {actionError && <p className="admin-state admin-state--error" role="alert">{actionError}</p>}
      {message && <p className="admin-state admin-state--success" role="status">{message}</p>}

      <div className="admin-content-manager__toolbar">
        <p>Manage employee codes, names, job titles, department assignments, and active status.</p>
        <button
          type="button"
          onClick={startNew}
          disabled={!collection?.storageConfigured || departments.length === 0 || saving}
        >
          Create employee record
        </button>
      </div>

      {loading && <p className="admin-state" role="status">Loading employee records…</p>}
      {!loading && !loadError && collection?.items.length === 0 && (
        <p className="admin-section-state" role="status">
          {collection.storageConfigured
            ? 'No employee records have been added.'
            : 'Employee records will be available after SQL Server is configured.'}
        </p>
      )}

      {!loading && collection && collection.items.length > 0 && (
        <div className="admin-managed-content-list">
          {collection.items.map((employee) => (
            <article className="admin-managed-content" key={employee.id}>
              <div>
                <span className={`admin-content-status${employee.active ? ' admin-content-status--published' : ''}`}>
                  {employee.active ? 'ACTIVE' : 'INACTIVE'}
                </span>
                <h2>{employee.fullName}</h2>
                <p>{employee.jobTitle} · {employee.departmentName}</p>
                <small>Employee code: {employee.employeeCode}</small>
                {employee.departmentHead && <small>Department head</small>}
              </div>
              <div className="admin-managed-content__actions">
                <button type="button" onClick={() => startEdit(employee)}>Edit</button>
                <button type="button" onClick={() => void deactivate(employee)}>
                  {employee.active ? 'Deactivate' : 'Reactivate'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {formOpen && (
        <form className="admin-content-form" onSubmit={(event) => void save(event)}>
          <h2>{editingEmployee ? 'Edit employee record' : 'Create employee record'}</h2>
          <fieldset disabled={saving}>
            <div className="admin-content-form__grid">
              <label>
                Employee code
                <input
                  value={form.employeeCode}
                  onChange={(event) => updateForm('employeeCode', event.target.value)}
                  required
                  maxLength={50}
                />
              </label>
              <label>
                Full name
                <input
                  value={form.fullName}
                  onChange={(event) => updateForm('fullName', event.target.value)}
                  required
                  maxLength={120}
                />
              </label>
              <label>
                Job title
                <input
                  value={form.jobTitle}
                  onChange={(event) => updateForm('jobTitle', event.target.value)}
                  required
                  maxLength={120}
                />
              </label>
              <label>
                Department
                <select
                  value={form.departmentId}
                  onChange={(event) => updateForm('departmentId', event.target.value)}
                  required
                >
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="admin-content-form__checkbox">
              <input
                type="checkbox"
                checked={form.departmentHead}
                onChange={(event) => updateForm('departmentHead', event.target.checked)}
              />
              Department head
            </label>
            <label className="admin-content-form__checkbox">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => updateForm('active', event.target.checked)}
              />
              Active employee
            </label>
            <div className="admin-content-form__actions">
              <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save employee'}</button>
              <button
                className="admin-content-form__cancel"
                type="button"
                onClick={() => setFormOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </section>
  )
}
