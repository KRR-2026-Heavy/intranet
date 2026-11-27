import { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { PDFDocumentLoadingTask, PDFPageProxy, RenderTask } from 'pdfjs-dist'
import { employeeModuleService } from '../services/employeeModuleService'
import type { OrganizationChartPage } from '../types/organizationCharts'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const chartPages: OrganizationChartPage[] = [1, 2]
const minZoom = 0.12
const maxZoom = 5

interface ChartPageCanvasProps {
  page: PDFPageProxy | undefined
  pageNumber: OrganizationChartPage
  zoom: number
}

function ChartPageCanvas({ page, pageNumber, zoom }: ChartPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [renderError, setRenderError] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!page || !canvas) return

    let cancelled = false
    let renderTask: RenderTask | undefined
    setRenderError(null)

    const viewport = page.getViewport({ scale: zoom })
    const outputScale = Math.min(window.devicePixelRatio || 1, 3)
    canvas.width = Math.ceil(viewport.width * outputScale)
    canvas.height = Math.ceil(viewport.height * outputScale)
    canvas.style.width = `${Math.ceil(viewport.width)}px`
    canvas.style.height = `${Math.ceil(viewport.height)}px`

    const context = canvas.getContext('2d', { alpha: false })
    if (!context) {
      setRenderError(`Page ${pageNumber} could not be drawn.`)
      return
    }
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)

    renderTask = page.render({
      canvas: null,
      canvasContext: context,
      viewport,
      transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
    })
    void renderTask.promise.catch((error: unknown) => {
      if (!cancelled && !(error instanceof Error && error.name === 'RenderingCancelledException')) {
        setRenderError(`Page ${pageNumber} could not be drawn.`)
      }
    })

    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [page, pageNumber, zoom])

  return (
    <div className="organization-board-canvas-wrap" onContextMenu={(event) => event.preventDefault()}>
      {renderError && <p className="employee-error" role="alert">{renderError}</p>}
      <canvas
        ref={canvasRef}
        className="organization-board-canvas"
        aria-label={`Organization Chart Page ${pageNumber}`}
        draggable={false}
      />
    </div>
  )
}

export default function OrganizationBoardPage() {
  const [pages, setPages] = useState<Partial<Record<OrganizationChartPage, PDFPageProxy>>>({})
  const [zoom, setZoom] = useState(0.75)
  const [activePage, setActivePage] = useState<OrganizationChartPage>(1)
  const [previewOpen, setPreviewOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<Partial<Record<OrganizationChartPage, HTMLElement | null>>>({})

  useEffect(() => {
    let active = true
    const loadingTasks: PDFDocumentLoadingTask[] = []
    const documents: PDFPageProxy[] = []
    const controller = new AbortController()

    async function loadPages() {
      try {
        const loadedPages = await Promise.all(chartPages.map(async (pageNumber) => {
          const response = await fetch(employeeModuleService.organizationChartUrl(pageNumber), {
            credentials: 'include',
            cache: 'no-store',
            headers: { Accept: 'application/pdf' },
            signal: controller.signal,
          })
          if (!response.ok) throw new Error(`Organization Chart Page ${pageNumber} failed to load (${response.status}).`)
          if (!response.headers.get('content-type')?.toLowerCase().includes('application/pdf')) {
            throw new Error(`Organization Chart Page ${pageNumber} was not returned as a PDF.`)
          }

          const data = new Uint8Array(await response.arrayBuffer())
          if (data.length === 0) throw new Error(`Organization Chart Page ${pageNumber} is empty.`)
          const task = pdfjs.getDocument({ data })
          loadingTasks.push(task)
          const document = await task.promise
          const page = await document.getPage(1)
          documents.push(page)
          return { pageNumber, page }
        }))

        if (active) {
          setPages(Object.fromEntries(loadedPages.map(({ pageNumber, page }) => [pageNumber, page])))
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'The organization charts could not be loaded.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadPages()
    return () => {
      active = false
      controller.abort()
      loadingTasks.forEach((task) => { void task.destroy() })
      documents.forEach((page) => page.cleanup())
    }
  }, [])

  function changeZoom(factor: number) {
    setZoom((current) => Math.min(maxZoom, Math.max(minZoom, current * factor)))
  }

  function goToPage(pageNumber: OrganizationChartPage) {
    setActivePage(pageNumber)
    const scrollArea = scrollAreaRef.current
    const page = pageRefs.current[pageNumber]
    if (!scrollArea || !page) return
    const top = page.getBoundingClientRect().top - scrollArea.getBoundingClientRect().top + scrollArea.scrollTop
    scrollArea.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <section className="organization-board-viewer" aria-label="Organization Board charts">
      <nav className="organization-board-controls" aria-label="Chart viewing controls">
        <button type="button" onClick={() => changeZoom(1.2)} disabled={!pages[1]}>Zoom In</button>
        <button type="button" onClick={() => changeZoom(1 / 1.2)} disabled={!pages[1]}>Zoom Out</button>
        <button type="button" onClick={() => goToPage(1)} aria-pressed={activePage === 1}>Page 1</button>
        <button type="button" onClick={() => goToPage(2)} aria-pressed={activePage === 2}>Page 2</button>
        <a href={employeeModuleService.organizationChartUrl(activePage, true)} download={`organization-chart-${activePage}.pdf`}>Download</a>
        <button type="button" onClick={() => setPreviewOpen((open) => !open)}>
          {previewOpen ? 'Close preview' : 'Open preview'}
        </button>
      </nav>

      {loading && <p className="employee-loading" role="status">Loading organization charts...</p>}
      {error && (
        <div className="organization-board-preview-error" role="alert">
          <p className="employee-error">{error}</p>
        </div>
      )}

      {previewOpen && (
        <div
          ref={scrollAreaRef}
          className="organization-board-scroll-area"
          onContextMenu={(event) => event.preventDefault()}
        >
          {chartPages.map((pageNumber) => (
            <section
              className="organization-board-page"
              key={pageNumber}
              ref={(node) => { pageRefs.current[pageNumber] = node }}
              aria-label={`Page ${pageNumber}`}
            >
              <h2 className="organization-board-page-label">Page {pageNumber}</h2>
              <ChartPageCanvas page={pages[pageNumber]} pageNumber={pageNumber} zoom={zoom} />
            </section>
          ))}
        </div>
      )}
    </section>
  )
}
