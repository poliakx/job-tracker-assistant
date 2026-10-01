import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

class PipelineRunError extends Error {
  constructor(public runId: string, message: string) {
    super(message)
  }
}
const runPipeline = vi.fn()
const sourceA = { name: 'a', label: 'A' }
const sourceB = { name: 'b', label: 'B' }

vi.mock('@/backend/runPipeline', () => ({ runPipeline, PipelineRunError }))
vi.mock('@/backend/sources', () => ({
  getSources: async () => [sourceA, sourceB],
  findSource: async (name: string) => [sourceA, sourceB].find(s => s.name === name),
}))

const { GET, POST } = await import('./route')

function makeRequest(body?: unknown) {
  return new NextRequest('http://localhost/api/search', {
    method: 'POST',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
}

const summary = { runId: 'run-1', fetched: 5, newCount: 2, analyzed: 1, errors: 0 }

describe('/api/search while scraping is disabled', () => {
  beforeEach(() => {
    runPipeline.mockReset()
    delete process.env.SCRAPING_ENABLED
  })

  it('GET lists no sources', async () => {
    const res = await GET()
    expect(await res.json()).toEqual([])
  })

  it('POST returns 403 and runs nothing', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(403)
    expect(runPipeline).not.toHaveBeenCalled()
  })
})

describe('/api/search', () => {
  beforeEach(() => {
    runPipeline.mockReset()
    runPipeline.mockResolvedValue(summary)
    process.env.SCRAPING_ENABLED = 'true'
  })

  it('GET lists the searchable sources', async () => {
    const res = await GET()
    expect(await res.json()).toEqual([sourceA, sourceB])
  })

  it('POST without a source searches all of them', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(summary)
    expect(runPipeline).toHaveBeenCalledWith([sourceA, sourceB])
  })

  it('POST with a source searches only that one', async () => {
    await POST(makeRequest({ source: 'b' }))
    expect(runPipeline).toHaveBeenCalledWith([sourceB])
  })

  it('POST with an unknown source returns 400 and runs nothing', async () => {
    const res = await POST(makeRequest({ source: 'nope' }))
    expect(res.status).toBe(400)
    expect(runPipeline).not.toHaveBeenCalled()
  })

  it('POST returns 500 with the run id if the pipeline fails', async () => {
    runPipeline.mockRejectedValue(new PipelineRunError('run-2', 'boom'))
    const res = await POST(makeRequest())
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'search failed', runId: 'run-2' })
  })
})
