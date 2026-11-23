import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Chevron from './Chevron'
import DepartmentGraphic from './DepartmentGraphic'
import { employeeModuleService } from '../services/employeeModuleService'
import type { Department } from '../types/employeeModules'

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    employeeModuleService.departments()
      .then(setDepartments)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load departments.'))
  }, [])

  const visibleDepartments = useMemo(
    () => departments.filter((department) => department.name.toLowerCase().includes(search.toLowerCase())),
    [departments, search],
  )

  return (
    <section className="employee-module-section" aria-labelledby="departments-title">
      <div className="employee-module-heading">
        <div>
          <p>OUR COMPANY</p>
          <h1 id="departments-title">Departments</h1>
        </div>
        <label className="employee-filter">
          <span className="sr-only">Filter departments</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a department" />
        </label>
      </div>
      {error && <p className="employee-error" role="alert">{error}</p>}
      {departments.length === 0 && !error && <p className="employee-loading">Loading departments…</p>}
      <div className="department-grid">
        {visibleDepartments.map((department) => (
          <Link className="department-card" to={`/employee/departments/${department.id}`} key={department.id}>
            <DepartmentGraphic type={department.graphic} className="department-card__graphic" />
            <div>
              <h2>{department.name}</h2>
              <span>View department information</span>
            </div>
            <Chevron className="department-card__chevron" />
          </Link>
        ))}
      </div>
      {departments.length > 0 && visibleDepartments.length === 0 && (
        <div className="employee-empty">No departments match “{search}”.</div>
      )}
    </section>
  )
}
