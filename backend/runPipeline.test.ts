import { beforeEach, describe, expect, it, vi } from 'vitest'

const createPipelineRun = vi.fn()
const finishPipelineRun = vi.fn()
const runIngest = vi.fn()
const runFilter = vi.fn()
const runAnalyze = vi.fn()

vi.mock('./db', () => ({ createPipelineRun, finishPipelineRun }))
vi.mock('./pipeline', () => ({ runIngest, runFilter, runAnalyze }))

const { runPipeline, PipelineRunError } = await import('./runPipeline')

const sourceA = { name: 'a', label: 'A', fetchRecent: vi.fn() }
const sourceB = { name: 'b', label: 'B', fetchRecent: vi.fn() }
const emptyUsage = { triageInputTokens: 0, triageOutputTokens: 0, deepInputTokens: 0, deepOutputTokens: 0 }

describe('runPipeline', () => {
  beforeEach(() => {
    for (const fn of [createPipelineRun, finishPipelineRun, runIngest, runFilter, runAnalyze]) fn.mockReset()
    createPipelineRun.mockResolvedValue({ id: 'run-1' })
    finishPipelineRun.mockResolvedValue({})
    runFilter.mockResolvedValue({ dismissed: 0, flagged: 0, clean: 0 })
    runAnalyze.mockResolvedValue({ analyzed: 1, errors: [], usage: emptyUsage })
  })

  it('ingests every source, sums the counts and records the run', async () => {
    runIngest.mockResolvedValueOnce({ fetched: 5, newCount: 2 }).mockResolvedValueOnce({ fetched: 3, newCount: 1 })

    const summary = await runPipeline([sourceA, sourceB])

    expect(summary).toEqual({ runId: 'run-1', fetched: 8, newCount: 3, analyzed: 1, errors: 0 })
    expect(createPipelineRun).toHaveBeenCalledWith('a,b')
    expect(runIngest).toHaveBeenCalledWith(sourceA)
    expect(runIngest).toHaveBeenCalledWith(sourceB)
    expect(finishPipelineRun).toHaveBeenCalledWith('run-1', expect.objectContaining({ fetched: 8, newCount: 3, analyzed: 1 }))
  })

  it('keeps going when one source fails and records it as an ingest error', async () => {
    runIngest.mockRejectedValueOnce(new Error('site down')).mockResolvedValueOnce({ fetched: 3, newCount: 1 })

    const summary = await runPipeline([sourceA, sourceB])

    expect(summary).toMatchObject({ fetched: 3, newCount: 1, errors: 1 })
    expect(runAnalyze).toHaveBeenCalled()
    expect(finishPipelineRun).toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({ errors: [expect.objectContaining({ stage: 'ingest', message: 'a: site down' })] })
    )
  })

  it('records a fatal error and throws PipelineRunError if a later stage throws', async () => {
    runIngest.mockResolvedValue({ fetched: 1, newCount: 1 })
    runFilter.mockRejectedValue(new Error('db down'))

    const promise = runPipeline([sourceA])

    await expect(promise).rejects.toBeInstanceOf(PipelineRunError)
    await expect(promise).rejects.toMatchObject({ runId: 'run-1', message: 'db down' })
    expect(finishPipelineRun).toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({ errors: [expect.objectContaining({ stage: 'fatal', message: 'db down' })] })
    )
  })
})
