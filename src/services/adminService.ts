import type {
  AdminContentCollection,
  AdminContentItem,
  AdminContentRequest,
  AdminDepartment,
  AdminDepartmentCollection,
  AdminDashboardOverview,
  AdminEmployeeCollection,
  AdminEmployeeProfile,
  AdminEmployeeRequest,
  ManagedContentCategory,
} from '../types/admin'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ??
  '/api'

async function request(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...init?.headers,
      },
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Cannot reach the admin service. Ensure the backend is running and try again.')
    }
    throw error
  }
}

async function responseMessage(response: Response, fallback: string): Promise<Error> {
  const body = await response.json().catch(() => null) as { message?: string } | null
  return new Error(body?.message ?? `${fallback} (${response.status}).`)
}

async function getCsrfToken(): Promise<string> {
  const response = await request('/auth/csrf')
  if (!response.ok) {
    throw await responseMessage(response, 'Unable to prepare a secure content request')
  }
  const payload = await response.json() as { token?: string }
  if (!payload.token) throw new Error('The security service returned an invalid CSRF token.')
  return payload.token
}

export async function getAdminOverview(): Promise<AdminDashboardOverview> {
  const response = await request('/admin/overview')
  if (!response.ok) {
    throw await responseMessage(response, 'Unable to load the administrator dashboard')
  }
  const payload = await response.json() as AdminDashboardOverview
  if (!payload || typeof payload.storageConfigured !== 'boolean' || !payload.categories) {
    throw new Error('The admin service returned an invalid dashboard response.')
  }
  return payload
}

export async function getManagedContent(
  category: ManagedContentCategory,
): Promise<AdminContentCollection> {
  const response = await request(`/admin/content/${category}`)
  if (!response.ok) {
    throw await responseMessage(response, 'Unable to load managed content')
  }
  const payload = await response.json() as AdminContentCollection
  if (!payload || !Array.isArray(payload.items) || typeof payload.storageConfigured !== 'boolean') {
    throw new Error('The admin service returned an invalid content collection.')
  }
  return payload
}

export async function saveManagedContent(
  category: ManagedContentCategory,
  itemId: number | null,
  content: AdminContentRequest,
): Promise<AdminContentItem> {
  const token = await getCsrfToken()
  const response = await request(
    itemId === null
      ? `/admin/content/${category}`
      : `/admin/content/${category}/${itemId}`,
    {
      method: itemId === null ? 'POST' : 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': token,
      },
      body: JSON.stringify(content),
    },
  )
  if (!response.ok) {
    throw await responseMessage(response, 'Content could not be saved')
  }
  return await response.json() as AdminContentItem
}

export async function deleteManagedContent(
  category: ManagedContentCategory,
  itemId: number,
): Promise<void> {
  const token = await getCsrfToken()
  const response = await request(`/admin/content/${category}/${itemId}`, {
    method: 'DELETE',
    headers: { 'X-XSRF-TOKEN': token },
  })
  if (!response.ok) {
    throw await responseMessage(response, 'Content could not be deleted')
  }
}

export async function getAdminEmployees(): Promise<AdminEmployeeCollection> {
  const response = await request('/admin/employees')
  if (!response.ok) {
    throw await responseMessage(response, 'Unable to load employee records')
  }
  const payload = await response.json() as AdminEmployeeCollection
  if (!payload || !Array.isArray(payload.items) || typeof payload.storageConfigured !== 'boolean') {
    throw new Error('The admin service returned an invalid employee collection.')
  }
  return payload
}

export async function saveAdminEmployee(
  employeeId: number | null,
  employee: AdminEmployeeRequest,
): Promise<AdminEmployeeProfile> {
  const token = await getCsrfToken()
  const response = await request(
    employeeId === null
      ? '/admin/employees'
      : `/admin/employees/${employeeId}`,
    {
      method: employeeId === null ? 'POST' : 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': token,
      },
      body: JSON.stringify(employee),
    },
  )
  if (!response.ok) {
    throw await responseMessage(response, 'Employee record could not be saved')
  }
  return await response.json() as AdminEmployeeProfile
}

export async function deactivateAdminEmployee(employeeId: number): Promise<void> {
  const token = await getCsrfToken()
  const response = await request(`/admin/employees/${employeeId}`, {
    method: 'DELETE',
    headers: { 'X-XSRF-TOKEN': token },
  })
  if (!response.ok) {
    throw await responseMessage(response, 'Employee could not be deactivated')
  }
}

export async function getAdminDepartments(): Promise<AdminDepartmentCollection> {
  const response = await request('/admin/departments')
  if (!response.ok) {
    throw await responseMessage(response, 'Unable to load department records')
  }
  const payload = await response.json() as AdminDepartmentCollection
  if (!payload || !Array.isArray(payload.items) || typeof payload.storageConfigured !== 'boolean') {
    throw new Error('The admin service returned an invalid department collection.')
  }
  return payload
}

export async function saveAdminDepartmentOverview(
  departmentId: string,
  overview: string,
): Promise<AdminDepartment> {
  const token = await getCsrfToken()
  const response = await request(`/admin/departments/${encodeURIComponent(departmentId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-XSRF-TOKEN': token,
    },
    body: JSON.stringify({ overview }),
  })
  if (!response.ok) {
    throw await responseMessage(response, 'Department overview could not be saved')
  }
  return await response.json() as AdminDepartment
}
