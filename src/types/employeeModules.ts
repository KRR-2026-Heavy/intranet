export interface Department {
  id: string
  name: string
  graphic: string
  overview: string
  employees: DepartmentEmployee[]
}

export interface DepartmentEmployee {
  name: string
  title: string
  departmentHead: boolean
}

export interface DashboardOverview {
  employeeProfiles: number | null
  departments: number
  publishedAnnouncements: number
  currentMeetings: number
}

export interface OrganizationPerson {
  name: string
  title: string
}

export interface OrganizationTeam {
  name: string
  people: OrganizationPerson[]
}

export interface OrganizationBoard {
  leadership: OrganizationPerson[]
  teams: OrganizationTeam[]
}

export interface PublishedContent {
  id: string
  title: string
  description: string
  date: string
  expiresOn: string | null
  department: string | null
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  pinned: boolean
}

export interface MonthlyThought {
  month: string
  year: number
  heading: string
  message: string
  author: string | null
}

export interface EmployeePolicySection {
  title: string
  content: string
  effectiveDate: string | null
}

export interface EmployeePolicy {
  effectiveDate: string | null
  sections: EmployeePolicySection[]
  published: boolean
}

export interface Meeting {
  title: string
  recurrence: string | null
  date: string | null
  time: string | null
  location: string | null
  agenda: string | null
}

export interface Holiday {
  name: string
  year: number | null
  date: string | null
  description: string | null
}

