export type OrganizationChartPage = 1 | 2

export interface OrganizationChartMetadata {
  page: OrganizationChartPage
  filename: string
  lastUpdated: string | null
  fileSize: number
  bundledOriginal: boolean
}
