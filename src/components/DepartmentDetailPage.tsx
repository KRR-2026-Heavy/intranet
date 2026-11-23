import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Chevron from './Chevron'
import DepartmentGraphic from './DepartmentGraphic'
import { employeeModuleService } from '../services/employeeModuleService'
import type { Department, PublishedContent } from '../types/employeeModules'

export default function DepartmentDetailPage() {
  const { departmentId = '' } = useParams()
  const [department, setDepartment] = useState<Department | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [updates, setUpdates] = useState<PublishedContent[]>([])
  const [updatesError, setUpdatesError] = useState<string | null>(null)

  useEffect(() => {
    employeeModuleService.departments()
      .then((departments) => {
        const selected = departments.find((entry) => entry.id === departmentId)
        if (!selected) {
          setError('This department was not found.')
          return
        }
        setDepartment(selected)
        Promise.all([
          employeeModuleService.announcements(),
          employeeModuleService.notices(),
        ])
          .then(([announcements, notices]) => {
            setUpdates([...announcements, ...notices].filter(
              (entry) => entry.department?.toLowerCase() === selected.name.toLowerCase(),
            ))
          })
          .catch((reason: unknown) => setUpdatesError(
            reason instanceof Error ? reason.message : 'Unable to load department updates.',
          ))
      })
      .catch((reason: unknown) => setError(
        reason instanceof Error ? reason.message : 'Unable to load this department.',
      ))
  }, [departmentId])

  return (
    <section className="employee-module-section">
      <Link className="module-page__back" to="/employee/departments">
        <Chevron className="module-page__back-chevron" />
        Back to Departments
      </Link>
      {error ? (
        <p className="employee-error" role="alert">{error}</p>
      ) : department ? (
        <>
          <header className="department-detail__header">
            <DepartmentGraphic type={department.graphic} className="department-detail__graphic" />
            <div>
              <p>DEPARTMENT</p>
              <h1>{department.name}</h1>
            </div>
          </header>
          <div className="department-detail__grid">
            <article className="employee-content-card">
              <h2>Overview</h2>
              <p>{department.overview}</p>
            </article>
            <article className="employee-content-card">
              <h2>Department head and employees</h2>
              {department.employees.length > 0 ? (
                <ul className="department-employee-list">
                  {department.employees.map((employee) => (
                    <li key={`${employee.name}-${employee.title}`}>
                      <strong>{employee.name}</strong>
                      <span>{employee.title}</span>
                      {employee.departmentHead && <small>Department Head</small>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No employee assignments have been published for this department.</p>
              )}
            </article>
            <article className="employee-content-card">
              <h2>Announcements and notices</h2>
              {updatesError && <p className="employee-error" role="alert">{updatesError}</p>}
              {!updatesError && updates.length === 0 && <p>No published department announcements or notices are currently available.</p>}
              {updates.map((update) => (
                <div className="department-update" key={update.id}>
                  <small>{update.date}</small>
                  <h3>{update.title}</h3>
                  <p>{update.description}</p>
                </div>
              ))}
            </article>
            <article className="employee-content-card">
              <h2>Documents</h2>
              <p>No department documents have been published.</p>
            </article>
          </div>
        </>
      ) : (
        <p className="employee-loading">Loading department…</p>
      )}
    </section>
  )
}
