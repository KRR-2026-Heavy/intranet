import { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { PDFDocumentLoadingTask, PDFPageProxy, RenderTask } from 'pdfjs-dist'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

interface PdfCanvasViewerProps {
  sourceUrl: string
  downloadUrl: string
  fileName: string
  onClose: () => void
}

function PdfPageCanvas({
  page,
  scale,
}: {
  page: PDFPageProxy
  scale: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [renderError, setRenderError] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false
    let renderTask: RenderTask | undefined
    setRenderError(false)
    const viewport = page.getViewport({ scale })
    const outputScale = Math.min(window.devicePixelRatio || 1, 3)
    canvas.width = Math.ceil(viewport.width * outputScale)
    canvas.height = Math.ceil(viewport.height * outputScale)
    canvas.style.width = `${Math.ceil(viewport.width)}px`
    canvas.style.height = `${Math.ceil(viewport.height)}px`

    const context = canvas.getContext('2d', { alpha: false })
    if (!context) {
      setRenderError(true)
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
        setRenderError(true)
      }
    })

    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [page, scale])

  return (
    <>
      {renderError && <p className="employee-error" role="alert">This PDF page could not be rendered.</p>}
      <canvas className="pdf-canvas-viewer__canvas" ref={canvasRef} aria-label="PDF page" />
    </>
  )
}

export default function PdfCanvasViewer({ sourceUrl, downloadUrl, fileName, onClose }: PdfCanvasViewerProps) {
  const [document, setDocument] = useState<pdfjs.PDFDocumentProxy | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let loadingTask: PDFDocumentLoadingTask | undefined
    const controller = new AbortController()
    setDocument(null)
    setPageNumber(1)
    setLoading(true)
    setError(null)

    async function loadPdf() {
      try {
        const response = await fetch(sourceUrl, {
          credentials: 'include',
          cache: 'no-store',
          headers: { Accept: 'application/pdf' },
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`PDF preview failed to load (${response.status}).`)
        if (!response.headers.get('content-type')?.toLowerCase().includes('application/pdf')) {
          throw new Error('The file endpoint did not return a PDF.')
        }
        const bytes = new Uint8Array(await response.arrayBuffer())
        if (!active) return
        if (!bytes.length) throw new Error('The PDF file is empty.')
        loadingTask = pdfjs.getDocument({ data: bytes })
        const loadedDocument = await loadingTask.promise
        if (active) setDocument(loadedDocument)
        else await loadingTask.destroy()
      } catch (reason) {
        if (active && !controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'The PDF preview could not be loaded.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadPdf()
    return () => {
      active = false
      controller.abort()
      if (loadingTask) void loadingTask.destroy()
    }
  }, [sourceUrl])

  const pageCount = document?.numPages ?? 0
  const changeScale = (factor: number) => setScale((current) => Math.min(5, Math.max(0.25, current * factor)))

  return (
    <section className="pdf-canvas-viewer" aria-label={`PDF preview: ${fileName}`}>
      <div className="pdf-canvas-viewer__toolbar" aria-label="PDF viewing controls">
        <div className="pdf-canvas-viewer__group" aria-label="Page navigation">
          <button type="button" onClick={() => setPageNumber((current) => Math.max(1, current - 1))} disabled={!document || pageNumber <= 1}>Previous page</button>
          <span>Page {document ? pageNumber : '—'} of {pageCount || '—'}</span>
          <button type="button" onClick={() => setPageNumber((current) => Math.min(pageCount, current + 1))} disabled={!document || pageNumber >= pageCount}>Next page</button>
        </div>
        <div className="pdf-canvas-viewer__group" aria-label="Zoom controls">
          <button type="button" onClick={() => changeScale(1 / 1.2)} disabled={!document}>Zoom out</button>
          <button type="button" onClick={() => changeScale(1.2)} disabled={!document}>Zoom in</button>
        </div>
        <div className="pdf-canvas-viewer__group">
          <a href={downloadUrl} download={fileName}>Download</a>
          <button type="button" onClick={onClose}>Close preview</button>
        </div>
      </div>
      {loading && <p className="employee-loading" role="status">Loading PDF preview…</p>}
      {error && <p className="employee-error" role="alert">{error}</p>}
      {document && !error && (
        <div className="pdf-canvas-viewer__page" onContextMenu={(event) => event.preventDefault()}>
          <LoadedPdfPage document={document} pageNumber={pageNumber} scale={scale} />
        </div>
      )}
    </section>
  )
}

function LoadedPdfPage({
  document,
  pageNumber,
  scale,
}: {
  document: pdfjs.PDFDocumentProxy
  pageNumber: number
  scale: number
}) {
  const [page, setPage] = useState<PDFPageProxy | null>(null)
  const [pageError, setPageError] = useState(false)

  useEffect(() => {
    let active = true
    setPageError(false)
    setPage(null)
    void document.getPage(pageNumber).then((loadedPage) => {
      if (active) setPage(loadedPage)
      else loadedPage.cleanup()
    }).catch(() => { if (active) setPageError(true) })
    return () => { active = false }
  }, [document, pageNumber])

  if (pageError) return <p className="employee-error" role="alert">This PDF page could not be loaded.</p>
  return page
    ? <PdfPageCanvas page={page} scale={scale} />
    : <p className="employee-loading" role="status">Loading page…</p>
}
