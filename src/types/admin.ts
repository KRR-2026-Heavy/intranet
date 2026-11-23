export type ManagedContentCategory =
  | 'announcements'
  | 'thoughts'
  | 'notices'
  | 'meetings'
  | 'holidays'
  | 'policies'

export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'SCHEDULED'

export interface AdminContentItem {
  id: number
  category: ManagedContentCategory
  title: string
  body: string
  status: ContentStatus
  scheduledAt: string | null
  publishedAt: string | null
  announcementDate: string | null
  expiresOn: string | null
  thoughtMonth: string | null
  department: string | null
  priority: string
  pinned: boolean
  author: string | null
  eventDate: string | null
  time: string | null
  location: string | null
  effectiveDate: string | null
  createdAt: string
  updatedAt: string
}

export interface AdminContentRequest {
  title: string
  body: string
  status: ContentStatus
  scheduledAt: string | null
  announcementDate: string | null
  expiresOn: string | null
  thoughtMonth: string | null
  department: string | null
  priority: string
  pinned: boolean
  author: string | null
  eventDate: string | null
  time: string | null
  location: string | null
  effectiveDate: string | null
}

export interface AdminContentCollection {
  storageConfigured: boolean
  items: AdminContentItem[]
  unavailableMessage: string | null
}

export interface CategoryCounts {
  published: number | null
  drafts: number | null
  scheduled: number | null
}

export interface AdminDashboardOverview {
  storageConfigured: boolean
  categories: Record<ManagedContentCategory, CategoryCounts>
  unavailableMessage: string | null
}

export interface AdminEmployeeProfile {
  id: number
  employeeCode: string
  fullName: string
  jobTitle: string
  departmentId: string
  departmentName: string
  active: boolean
  departmentHead: boolean
}

export interface AdminEmployeeRequest {
  employeeCode: string
  fullName: string
  jobTitle: string
  departmentId: string
  active: boolean
  departmentHead: boolean
}

export interface AdminEmployeeCollection {
  storageConfigured: boolean
  items: AdminEmployeeProfile[]
  unavailableMessage: string | null
}

export interface AdminDepartment {
  id: string
  name: string
  graphic: string
  overview: string
  activeEmployees: number
}

export interface AdminDepartmentCollection {
  storageConfigured: boolean
  items: AdminDepartment[]
  unavailableMessage: string | null
}
