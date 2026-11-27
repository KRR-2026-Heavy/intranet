import { useCallback, useEffect, useState } from 'react'
import PdfCanvasViewer from '../components/PdfCanvasViewer'
import {
  adminOrganizationChartFileUrl,
  getAdminOrganizationCharts,
  replaceAdminOrganizationChart,
} from '../services/adminService'
import type { OrganizationChartMetadata, OrganizationChartPage } from '../types/organizationCharts'

const chartPages: OrganizationChartPage[] = [1, 2]
const maxFileSize = 20 * 1024 * 1024

function formatDate(value: string | null) {
  if (!value) return 'Original file included with the intranet'
  return new Date(value).toLocaleString()
}

function formatSize(value: number) {
  return `${(value / (1024 * 1024)).toFixed(2)} MB`
}

export default function AdminOrganizationChartManager() {
  const [charts, setCharts] = useState<OrganizationChartMetadata[]>([])
  const [files, setFiles] = useState<Partial<Record<OrganizationChartPage, File>>>({})
  const [loading, setLoading] = useState(true)
  const [loadingError, setLoadingError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [uploadingPage, setUploadingPage] = useState<OrganizationChartPage | null>(null)
  const [previewPage, setPreviewPage] = useState<OrganizationChartPage | null>(null)

  const refreshCharts = useCallback(async () => {
    setLoadingError(null)
    try {
      setCharts(await getAdminOrganizationCharts())
    } catch (error) {
      setLoadingError(error instanceof Error ? error.message : 'Unable to load organization charts.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshCharts()
  }, [refreshCharts])

  async function uploadChart(page: OrganizationChartPage) {
    const file = files[page]
    if (!file) {
      setUploadError(`Choose a PDF for Page ${page} first.`)
      return
    }
    if (!file.name.toLowerCase().endsWith('.pdf') || (file.type && file.type !== 'application/pdf')) {
      setUploadError('Only PDF files can be uploaded.')
      return
    }
    if (file.size > maxFileSize) {
      setUploadError('PDF files cannot exceed 20 MB.')
      return
    }

    setUploadingPage(page)
    setUploadError(null)
    setMessage(null)
    try {
      await replaceAdminOrganizationChart(page, file)
      setFiles((current) => ({ ...current, [page]: undefined }))
      setMessage(`Page ${page} organization chart updated.`)
      await refreshCharts()
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : `Page ${page} could not be updated.`)
    } finally {
      setUploadingPage(null)
    }
  }

  return (
    <section className="admin-organization-chart-manager" aria-label="Organization chart management">
      <p className="admin-organization-chart-manager__notice">Employees can only view this chart.</p>
      {loadingError && <p className="admin-state admin-state--error" role="alert">{loadingError}</p>}
      {loading && <p className="admin-state" role="status">Loading organization charts...</p>}
      {uploadError && <p className="admin-state admin-state--error" role="alert">{uploadError}</p>}
      {message && <p className="admin-state" role="status">{message}</p>}

      <div className="admin-organization-chart-list">
        {chartPages.map((page) => {
          const chart = charts.find((item) => item.page === page)
          return (
            <article className="admin-organization-chart-card" key={page}>
              <div className="admin-organization-chart-card__heading">
                <h2>Page {page}</h2>
                {chart && <span>{chart.bundledOriginal ? 'Original' : 'Uploaded'}</span>}
              </div>
              <dl>
                <div><dt>Current file</dt><dd>{chart?.filename ?? 'Loading...'}</dd></div>
                <div><dt>Last updated</dt><dd>{formatDate(chart?.lastUpdated ?? null)}</dd></div>
                {chart && <div><dt>File size</dt><dd>{formatSize(chart.fileSize)}</dd></div>}
              </dl>
              <button type="button" onClick={() => setPreviewPage(page)}>Preview current PDF</button>
              <label>
                <span>Upload or replace Page {page} PDF</span>
                <input
                  key={`${page}-${files[page]?.name ?? 'empty'}`}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => {
                    setUploadError(null)
                    setFiles((current) => ({ ...current, [page]: event.currentTarget.files?.[0] }))
                  }}
                />
              </label>
              <button
                type="button"
                disabled={!files[page] || uploadingPage !== null}
                onClick={() => { void uploadChart(page) }}
              >
                {uploadingPage === page ? 'Uploading...' : chart?.bundledOriginal ? 'Upload Page ' + page : 'Replace Page ' + page}
              </button>
            </article>
          )
        })}
      </div>
      {previewPage !== null && (
        <PdfCanvasViewer
          sourceUrl={adminOrganizationChartFileUrl(previewPage)}
          downloadUrl={adminOrganizationChartFileUrl(previewPage, true)}
          fileName={charts.find((item) => item.page === previewPage)?.filename ?? `organization-chart-${previewPage}.pdf`}
          onClose={() => setPreviewPage(null)}
        />
      )}
    </section>
  )
}
