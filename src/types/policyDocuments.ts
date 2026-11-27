export const POLICY_DOCUMENT_SECTIONS = [
  { key: 'policies', label: 'Policies' },
  { key: 'procedure', label: 'Procedure' },
  { key: 'committee', label: 'Committee' },
  { key: 'sops', label: "SOP's" },
  { key: 'process-flow-chart', label: 'Process Flow Chart' },
] as const

export type PolicyDocumentSectionKey = typeof POLICY_DOCUMENT_SECTIONS[number]['key']
export type PolicyDocumentStatus = 'DRAFT' | 'PUBLISHED'

export interface PolicyDocument {
  id: number
  section: PolicyDocumentSectionKey
  title: string
  description: string | null
  originalFileName: string
  mediaType: string
  fileSize: number
  status: PolicyDocumentStatus
  createdAt: string
  updatedAt: string
}

export interface PolicyDocumentCollection {
  storageConfigured: boolean
  items: PolicyDocument[]
  unavailableMessage: string | null
}
