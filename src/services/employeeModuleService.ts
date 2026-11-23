import type {
  Department,
  DashboardOverview,
  EmployeePolicy,
  Holiday,
  Meeting,
  MonthlyThought,
  OrganizationBoard,
  PublishedContent,
} from '../types/employeeModules'

async function getJson<T>(path: string): Promise<T> {
  let response: Response

  try {
    response = await fetch(`/api/employee/${path}`, {
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
  organization: () => getJson<OrganizationBoard>('organization'),
  announcements: () => getJson<PublishedContent[]>('announcements'),
  notices: () => getJson<PublishedContent[]>('notices'),
  monthlyThought: () => getJson<MonthlyThought | null>('monthly-thought'),
  policy: () => getJson<EmployeePolicy>('policy'),
  meetings: () => getJson<Meeting[]>('meetings'),
  holidays: () => getJson<Holiday[]>('holidays'),
}
