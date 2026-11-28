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
  content: string | null
  originalFileName: string | null
  mediaType: string | null
  fileSize: number | null
  status: PolicyDocumentStatus
  createdAt: string
  updatedAt: string
}

export interface PolicyDocumentCollection {
  storageConfigured: boolean
  items: PolicyDocument[]
  unavailableMessage: string | null
}

export const ALLOWED_POLICY_FILE_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'jpg',
  'jpeg',
  'png',
] as const

export const ALLOWED_POLICY_FILE_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png'
export const MAX_POLICY_FILE_SIZE = 20 * 1024 * 1024

export function formatPolicyFileSize(size: number | null): string {
  if (size === null || size <= 0) return ''
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function describePolicyFileType(fileName: string | null, mediaType: string | null): string {
  const ext = fileName?.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf' || mediaType === 'application/pdf') return 'PDF'
  if (ext === 'doc' || mediaType === 'application/msword') return 'Word (DOC)'
  if (ext === 'docx' || mediaType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'Word (DOCX)'
  if (ext === 'xls' || mediaType === 'application/vnd.ms-excel') return 'Excel (XLS)'
  if (ext === 'xlsx' || mediaType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'Excel (XLSX)'
  if (ext === 'ppt' || mediaType === 'application/vnd.ms-powerpoint') return 'PowerPoint (PPT)'
  if (ext === 'pptx' || mediaType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return 'PowerPoint (PPTX)'
  if (ext === 'png' || mediaType === 'image/png') return 'PNG Image'
  if (ext === 'jpg' || ext === 'jpeg' || mediaType === 'image/jpeg') return 'JPG Image'
  return 'Written content'
}

export function validateSelectedPolicyFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_POLICY_FILE_EXTENSIONS.includes(ext as typeof ALLOWED_POLICY_FILE_EXTENSIONS[number])) {
    return 'Unsupported file type. Upload only PDF, Word (DOC/DOCX), Excel (XLS/XLSX), PowerPoint (PPT/PPTX), or JPG/PNG images.'
  }
  if (file.size <= 0) {
    return 'The selected file is empty. Please choose a valid file.'
  }
  if (file.size > MAX_POLICY_FILE_SIZE) {
    return 'File is too large. Policy files cannot exceed 20 MB.'
  }
  return null
}

export function formatPolicyUpdatedAt(isoDate: string): string {
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) return isoDate
  return parsed.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
