import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import OrganizationBoardPage from '../components/OrganizationBoardPage'
import PdfCanvasViewer from '../components/PdfCanvasViewer'

describe('organization board', () => {
  it('renders two canvas pages with view-only navigation, zoom, download and close controls', () => {
    const markup = renderToStaticMarkup(<OrganizationBoardPage />)

    expect(markup.indexOf('aria-label="Page 1"')).toBeLessThan(markup.indexOf('aria-label="Page 2"'))
    expect(markup.match(/<canvas/g)).toHaveLength(2)
    expect(markup).toContain('Zoom In')
    expect(markup).toContain('Zoom Out')
    expect(markup).toContain('Page 1')
    expect(markup).toContain('Page 2')
    expect(markup).toContain('Download')
    expect(markup).toContain('Close preview')
    expect(markup).not.toMatch(/<iframe|<embed|Fit to Width|Print|Save|Draw|Edit/)
    expect(markup).not.toMatch(/Leadership|Departments and teams|Search people/)
  })

  it('uses the canvas PDF viewer without browser PDF plugins or editing tools', () => {
    const markup = renderToStaticMarkup(
      <PdfCanvasViewer
        sourceUrl="/api/employee/policy-documents/1/file"
        downloadUrl="/api/employee/policy-documents/1/file?download=true"
        fileName="process-flow.pdf"
        onClose={() => undefined}
      />,
    )

    expect(markup).toContain('Previous page')
    expect(markup).toContain('Next page')
    expect(markup).toContain('Zoom in')
    expect(markup).toContain('Zoom out')
    expect(markup).toContain('Download')
    expect(markup).toContain('Close preview')
    expect(markup).not.toMatch(/<iframe|<embed|Draw|Highlight|Save|Print/)
  })
})
