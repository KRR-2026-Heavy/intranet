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
import type { PolicyDocument, PolicyDocumentCollection, PolicyDocumentSectionKey, PolicyDocumentStatus } from '../types/policyDocuments'
import type { OrganizationChartMetadata, OrganizationChartPage } from '../types/organizationCharts'
import type { AdminThirukkuralCollection } from '../types/thirukkural'

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

export async function getAdminOrganizationCharts(): Promise<OrganizationChartMetadata[]> {
  const response = await request('/admin/organization-charts')
  if (!response.ok) throw await responseMessage(response, 'Unable to load organization charts')
  const charts = await response.json() as OrganizationChartMetadata[]
  if (!Array.isArray(charts) || charts.length !== 2) {
    throw new Error('The organization chart service returned an invalid response.')
  }
  return charts
}

export async function replaceAdminOrganizationChart(
  page: OrganizationChartPage,
  file: File,
): Promise<OrganizationChartMetadata> {
  const token = await getCsrfToken()
  const form = new FormData()
  form.append('file', file, file.name)
  const response = await request(`/admin/organization-charts/${page}/file`, {
    method: 'PUT',
    headers: { 'X-XSRF-TOKEN': token },
    body: form,
  })
  if (!response.ok) throw await responseMessage(response, `Chart ${page} could not be uploaded`)
  return await response.json() as OrganizationChartMetadata
}

export function adminOrganizationChartFileUrl(page: OrganizationChartPage, download = false) {
  return `${API_BASE_URL}/admin/organization-charts/${page}/file${download ? '?download=true' : ''}`
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

export async function getAdminThirukkuralCollection(): Promise<AdminThirukkuralCollection> {
  const response = await request('/admin/thirukkural-collection')
  if (!response.ok) throw await responseMessage(response, 'Unable to load the Thirukkural collection')
  return await response.json() as AdminThirukkuralCollection
}

export async function publishAdminThirukkuralCollection(couplets: Array<{ kuralNumber: number; line1: string; line2: string }>): Promise<AdminThirukkuralCollection> {
  const token = await getCsrfToken()
  const response = await request('/admin/thirukkural-collection', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': token },
    body: JSON.stringify({ couplets }),
  })
  if (!response.ok) throw await responseMessage(response, 'Thirukkural couplets could not be published')
  return await response.json() as AdminThirukkuralCollection
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

export async function getAdminPolicyDocuments(): Promise<PolicyDocumentCollection> {
  const response = await request('/admin/policy-documents')
  if (!response.ok) throw await responseMessage(response, 'Unable to load policy documents')
  const payload = await response.json() as PolicyDocumentCollection
  if (!payload || !Array.isArray(payload.items) || typeof payload.storageConfigured !== 'boolean') {
    throw new Error('The policy document service returned an invalid collection.')
  }
  return payload
}

export interface PolicyDocumentFormData {
  section: PolicyDocumentSectionKey
  title: string
  description: string
  content: string
  status: PolicyDocumentStatus
  file: File | null
}

export async function saveAdminPolicyDocument(
  documentId: number | null,
  document: PolicyDocumentFormData,
): Promise<PolicyDocument> {
  const token = await getCsrfToken()
  const form = new FormData()
  form.append('section', document.section)
  form.append('title', document.title)
  form.append('description', document.description)
  form.append('content', document.content)
  form.append('status', document.status)
  if (document.file) form.append('file', document.file, document.file.name)
  const response = await request(
    documentId === null ? '/admin/policy-documents' : `/admin/policy-documents/${documentId}`,
    {
      method: documentId === null ? 'POST' : 'PUT',
      headers: { 'X-XSRF-TOKEN': token },
      body: form,
    },
  )
  if (!response.ok) throw await responseMessage(response, 'Policy document could not be saved')
  return await response.json() as PolicyDocument
}

export async function replaceAdminPolicyDocumentFile(
  documentId: number,
  file: File,
): Promise<PolicyDocument> {
  const token = await getCsrfToken()
  const form = new FormData()
  form.append('file', file, file.name)
  const response = await request(`/admin/policy-documents/${documentId}/file`, {
    method: 'PUT',
    headers: { 'X-XSRF-TOKEN': token },
    body: form,
  })
  if (!response.ok) throw await responseMessage(response, 'Policy document file could not be replaced')
  return await response.json() as PolicyDocument
}

export async function updateAdminPolicyDocumentStatus(
  documentId: number,
  status: PolicyDocumentStatus,
): Promise<PolicyDocument> {
  const token = await getCsrfToken()
  const response = await request(`/admin/policy-documents/${documentId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-XSRF-TOKEN': token,
    },
    body: JSON.stringify({ status }),
  })
  if (!response.ok) throw await responseMessage(response, 'Policy document status could not be updated')
  return await response.json() as PolicyDocument
}

export async function deleteAdminPolicyDocument(documentId: number): Promise<void> {
  const token = await getCsrfToken()
  const response = await request(`/admin/policy-documents/${documentId}`, {
    method: 'DELETE',
    headers: { 'X-XSRF-TOKEN': token },
  })
  if (!response.ok) throw await responseMessage(response, 'Policy document could not be deleted')
}

export function adminPolicyDocumentFileUrl(documentId: number, download = false) {
  return `${API_BASE_URL}/admin/policy-documents/${documentId}/file${download ? '?download=true' : ''}`
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
