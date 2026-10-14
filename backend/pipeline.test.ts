import { beforeEach, describe, expect, it, vi } from 'vitest'

const claimVacancyAnalysis = vi.fn()
const countAnalyzedSince = vi.fn()
const deferVacancyAnalysis = vi.fn()
const getActiveProfile = vi.fn()
const getVacanciesPendingAnalysis = vi.fn()
const triageVacancy = vi.fn()
const analyzeVacancyDeep = vi.fn()

vi.mock('./db', () => ({
  claimVacancyAnalysis,
  countAnalyzedSince,
  deferVacancyAnalysis,
  getActiveProfile,
  getVacanciesPendingAnalysis,
  getVacanciesPendingFilter: vi.fn(),
  updateVacancy: vi.fn(),
}))
vi.mock('./llm/analyze', () => ({ triageVacancy, analyzeVacancyDeep }))
vi.mock('./ingest/upsert', () => ({ upsertVacancies: vi.fn() }))

const { runAnalyze } = await import('./pipeline')

const usage = { inputTokens: 10, outputTokens: 5 }
const v1 = { id: 'v1', title: 'Dev 1', company: 'A', description: '' }
const v2 = { id: 'v2', title: 'Dev 2', company: 'B', description: '' }
const deepResult = { fitScore: 80, suggestedResume: 'BACKEND' }

describe('runAnalyze', () => {
  beforeEach(() => {
    for (const fn of [claimVacancyAnalysis, countAnalyzedSince, deferVacancyAnalysis, getVacanciesPendingAnalysis, triageVacancy, analyzeVacancyDeep]) {
      fn.mockReset()
    }
    countAnalyzedSince.mockResolvedValue(0)
    getActiveProfile.mockResolvedValue({})
    claimVacancyAnalysis.mockResolvedValue(true)
    deferVacancyAnalysis.mockResolvedValue(undefined)
    delete process.env.ANALYSIS_DAILY_CAP
  })

  it('moves a vacancy whose triage failed to the back of the queue and carries on', async () => {
    getVacanciesPendingAnalysis.mockResolvedValue([v1, v2])
    triageVacancy
      .mockResolvedValueOnce({ ok: false, error: 'API call failed — HTTP 529: Overloaded', usage })
      .mockResolvedValueOnce({ ok: true, result: { worthDeepAnalysis: true, reason: 'fits' }, usage })
    analyzeVacancyDeep.mockResolvedValue({ ok: true, result: deepResult, usage })

    const result = await runAnalyze(5)

    expect(deferVacancyAnalysis).toHaveBeenCalledWith('v1')
    expect(deferVacancyAnalysis).toHaveBeenCalledTimes(1)
    expect(result.analyzed).toBe(1)
    expect(result.errors).toEqual([{ vacancyId: 'v1', stage: 'triage', message: 'API call failed — HTTP 529: Overloaded' }])
  })

  it('defers a vacancy whose deep analysis failed', async () => {
    getVacanciesPendingAnalysis.mockResolvedValue([v1])
    triageVacancy.mockResolvedValue({ ok: true, result: { worthDeepAnalysis: true, reason: 'fits' }, usage })
    analyzeVacancyDeep.mockResolvedValue({ ok: false, error: 'cut off', usage })

    const result = await runAnalyze(5)

    expect(deferVacancyAnalysis).toHaveBeenCalledWith('v1')
    expect(claimVacancyAnalysis).not.toHaveBeenCalled()
    expect(result.errors[0]).toMatchObject({ vacancyId: 'v1', stage: 'deep' })
  })

  it('asks for at most what is left of the daily cap', async () => {
    process.env.ANALYSIS_DAILY_CAP = '10'
    countAnalyzedSince.mockResolvedValue(8)
    getVacanciesPendingAnalysis.mockResolvedValue([])

    await runAnalyze(5)

    expect(getVacanciesPendingAnalysis).toHaveBeenCalledWith(2)
  })

  it('does nothing once the daily cap is used up', async () => {
    process.env.ANALYSIS_DAILY_CAP = '10'
    countAnalyzedSince.mockResolvedValue(10)

    const result = await runAnalyze(5)

    expect(getVacanciesPendingAnalysis).not.toHaveBeenCalled()
    expect(result.analyzed).toBe(0)
  })
})
