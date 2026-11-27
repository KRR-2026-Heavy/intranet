export interface ThirukkuralCouplet {
  kuralNumber: number
  line1: string
  line2: string
}

export interface EmployeeThirukkural {
  kuralNumber: number
  line1: string
  line2: string
  startDate: string
  nextChangeAt: string
}

export interface AdminThirukkuralCollection {
  storageConfigured: boolean
  schemaReady: boolean
  published: boolean
  startDate: string | null
  currentKuralNumber: number
  couplets: ThirukkuralCouplet[]
}
