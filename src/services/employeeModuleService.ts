import type {
  Department,
  DashboardOverview,
  EmployeePolicy,
  Holiday,
  Meeting,
  MonthlyThought,
  PublishedContent,
} from '../types/employeeModules'
import type { PolicyDocumentCollection } from '../types/policyDocuments'
import type { EmployeeThirukkural } from '../types/thirukkural'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ??
  '/api'

async function getJson<T>(path: string): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}/employee/${path}`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Cannot reach the employee services. Check that the backend is running.')
    }

    throw error
  }

  if (!response.ok) {
    throw new Error(`Employee service request failed (${response.status}).`)
  }

  if (response.status === 204) {
    return null as T
  }

  return (await response.json()) as T
}

export const employeeModuleService = {
  departments: () => getJson<Department[]>('departments'),
  overview: () => getJson<DashboardOverview>('overview'),
  organizationChartUrl: (chartNumber: 1 | 2, download = false) =>
    `${API_BASE_URL}/employee/organization-charts/${chartNumber}${download ? '?download=true' : ''}`,
  announcements: () => getJson<PublishedContent[]>('announcements'),
  notices: () => getJson<PublishedContent[]>('notices'),
  monthlyThought: () => getJson<MonthlyThought | null>('monthly-thought'),
  thirukkural: () => getJson<EmployeeThirukkural | null>('thirukkural'),
  policy: () => getJson<EmployeePolicy>('policy'),
  policyDocuments: () => getJson<PolicyDocumentCollection>('policy-documents'),
  policyDocumentFileUrl: (id: number, download = false) =>
    `${API_BASE_URL}/employee/policy-documents/${id}/file${download ? '?download=true' : ''}`,
  meetings: () => getJson<Meeting[]>('meetings'),
  holidays: () => getJson<Holiday[]>('holidays'),
}
