import { Link, useParams } from 'react-router-dom'
import Chevron from '../components/Chevron'
import DepartmentsPage from '../components/DepartmentsPage'
import DepartmentDetailPage from '../components/DepartmentDetailPage'
import EmployeeModuleContent from '../components/EmployeeModuleContent'
import type { ModuleKey } from '../components/EmployeeModuleContent'
import OrganizationBoardPage from '../components/OrganizationBoardPage'
import { getPageBackgroundStyle } from '../config/pageBackgrounds'

const moduleNames: Record<string, string> = {
  'organization-board': 'Organization Board',
  departments: 'Departments',
  announcements: 'Company Announcements',
  thoughts: 'Thoughts for the Month',
  notices: 'Important Notices',
  meetings: 'Meeting Updates',
  'quick-access': 'Quick Access',
  'it-support': 'IT Support',
  policies: 'Company Policies',
  holidays: 'Holiday List',
}
const contentModules: ModuleKey[] = [
  'announcements', 'thoughts', 'notices', 'meetings', 'quick-access',
  'it-support', 'policies', 'holidays',
]

export default function EmployeeModulePage() {
  const { module = '', departmentId } = useParams()
  const routeModule = module || (departmentId ? 'departments' : '')
  const title = moduleNames[routeModule]
  const contentModule = contentModules.find((item) => item === module)

  if (!title) {
    return (
      <main className="module-page">
        <Link className="module-page__back" to="/employee">
          <Chevron className="module-page__back-chevron" />
          Back to Employee Dashboard
        </Link>
        <section className="module-page__panel">
          <p>EMPLOYEE PORTAL</p>
          <h1>Page not found</h1>
          <p>This employee portal page does not exist.</p>
        </section>
      </main>
    )
  }

  return (
    <div
      className="employee-module-layout"
      style={getPageBackgroundStyle(`employee-module-${routeModule}`)}
    >
      <header className="employee-module-topbar">
        <Link className="module-page__back" to="/employee">
          <Chevron className="module-page__back-chevron" />
          Employee Dashboard
        </Link>
        <span>{title}</span>
      </header>
      <main>
        {departmentId && <DepartmentDetailPage />}
        {!departmentId && routeModule === 'departments' && <DepartmentsPage />}
        {routeModule === 'organization-board' && <OrganizationBoardPage />}
        {contentModule && <EmployeeModuleContent module={contentModule} />}
      </main>
    </div>
  )
}
