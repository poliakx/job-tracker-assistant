import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

class PipelineRunError extends Error {
  constructor(public runId: string, message: string) {
    super(message)
  }
}
const runPipeline = vi.fn()
const sources = [{ name: 'example', label: 'example.com' }]

vi.mock('@/backend/vacancies/pipeline/run', () => ({ runPipeline, PipelineRunError }))
vi.mock('@/backend/vacancies/sources', () => ({ getSources: async () => sources }))

const { POST } = await import('./route')

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/cron/ingest', { method: 'POST', headers })
}

describe('POST /api/cron/ingest', () => {
  beforeEach(() => {
    runPipeline.mockReset()
    delete process.env.CRON_SECRET
    process.env.SCRAPING_ENABLED = 'true'
  })

  it('returns 403 and runs nothing while scraping is disabled, even with the right secret', async () => {
    process.env.CRON_SECRET = 'right-secret'
    delete process.env.SCRAPING_ENABLED
    const res = await POST(makeRequest({ authorization: 'Bearer right-secret' }))
    expect(res.status).toBe(403)
    expect(runPipeline).not.toHaveBeenCalled()
  })

  it('returns 401 when CRON_SECRET is not configured on the server', async () => {
    const res = await POST(makeRequest({ authorization: 'Bearer anything' }))
    expect(res.status).toBe(401)
    expect(runPipeline).not.toHaveBeenCalled()
  })

  it('returns 401 when the Authorization header is missing', async () => {
    process.env.CRON_SECRET = 'right-secret'
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 401 when the secret is wrong', async () => {
    process.env.CRON_SECRET = 'right-secret'
    const res = await POST(makeRequest({ authorization: 'Bearer wrong-secret' }))
    expect(res.status).toBe(401)
    expect(runPipeline).not.toHaveBeenCalled()
  })

  it('runs the pipeline over every source and returns its summary', async () => {
    process.env.CRON_SECRET = 'right-secret'
    const summary = { runId: 'run-1', fetched: 5, newCount: 2, analyzed: 1, errors: 0 }
    runPipeline.mockResolvedValue(summary)

    const res = await POST(makeRequest({ authorization: 'Bearer right-secret' }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(summary)
    expect(runPipeline).toHaveBeenCalledWith(sources)
  })

  it('returns 500 with the run id if the pipeline fails', async () => {
    process.env.CRON_SECRET = 'right-secret'
    runPipeline.mockRejectedValue(new PipelineRunError('run-2', 'network down'))

    const res = await POST(makeRequest({ authorization: 'Bearer right-secret' }))

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'pipeline run failed', runId: 'run-2' })
  })
})
