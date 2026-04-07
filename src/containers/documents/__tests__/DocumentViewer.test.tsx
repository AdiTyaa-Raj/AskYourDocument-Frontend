import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { DocumentViewer } from '../components/DocumentViewer'

vi.mock('docx-preview', () => ({
  renderAsync: vi.fn().mockResolvedValue(undefined),
}))

const createFileUrlData = (url: string) => ({
  document_id: 1,
  file_url: url,
  expires_in: 60,
  message: 'ok',
})

function mockFetch(buffer: ArrayBuffer, ok = true) {
  const response = new Response(buffer, { status: ok ? 200 : 500 })
  global.fetch = vi.fn().mockResolvedValue(response)
  return response
}

describe('DocumentViewer', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches PDF blobs once for pdf files', async () => {
    mockFetch(new ArrayBuffer(8))

    render(
      <DocumentViewer
        filename="sample.pdf"
        mimeType="application/pdf"
        extractedText={null}
        textExtractionStatus="COMPLETED"
        fileUrlData={createFileUrlData('https://test/pdf')}
        isLoadingFileUrl={false}
      />
    )

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))
  })

  it('fetches docx data for word files', async () => {
    mockFetch(new ArrayBuffer(8))

    render(
      <DocumentViewer
        filename="sample.docx"
        mimeType="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        extractedText={null}
        textExtractionStatus="COMPLETED"
        fileUrlData={createFileUrlData('https://test/docx')}
        isLoadingFileUrl={false}
      />
    )

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('https://test/docx'))
  })

  it('fetches xlsx data for spreadsheets', async () => {
    mockFetch(new ArrayBuffer(8))

    render(
      <DocumentViewer
        filename="sample.xlsx"
        mimeType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        extractedText={null}
        textExtractionStatus="COMPLETED"
        fileUrlData={createFileUrlData('https://test/xlsx')}
        isLoadingFileUrl={false}
      />
    )

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('https://test/xlsx'))
  })
})
