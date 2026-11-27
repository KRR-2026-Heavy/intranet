import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import EmployeeModuleContent from '../components/EmployeeModuleContent'
import EmployeeDashboard from '../pages/EmployeeDashboard'
import EmployeeModulePage from '../pages/EmployeeModulePage'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: null, setUser: () => undefined }),
}))

describe('employee frontend navigation', () => {
  it('renders the removed leave URL as not found', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/employee/leave-management'] },
        createElement(
          Routes,
          null,
          createElement(Route, {
            path: '/employee/:module',
            element: createElement(EmployeeModulePage),
          }),
        ),
      ),
    )

    expect(markup).toContain('Page not found')
    expect(markup).not.toContain('Leave Management')
  })

  it('omits notices and leave cards from the employee dashboard', () => {
    const markup = renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(EmployeeDashboard)),
    )

    expect(markup).not.toContain('IMPORTANT NOTICES')
    expect(markup).not.toContain('LEAVE MANAGEMENT')
    expect(markup).toContain('ORGANIZATION BOARD')
    expect(markup).toContain('DEPARTMENTS')
  })

  it('renders the Quick Access intercom extension numbers directory without old shortcuts', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(EmployeeModuleContent, { module: 'quick-access' }),
      ),
    )

    expect(markup).toContain('INTERCOM EXTENSION NUMBERS')
    expect(markup).toContain('Sakthivel Ramaswamy')
    expect(markup).toContain('100')
    expect(markup).toContain('Mohamed faizudeen')
    expect(markup).toContain('711')
    expect(markup).not.toContain('Important Notices')
    expect(markup).not.toContain('href="/employee/notices"')
    expect(markup).not.toContain('Leave Management')
    expect(markup).not.toContain('leave-management')
  })
})
