import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

const createMock = vi.fn()

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: createMock }
  },
}))

const { callTool } = await import('./callTool')

const params = {
  model: 'test-model',
  systemPrompt: 'system',
  messages: [{ role: 'user' as const, content: 'hi' }],
  toolName: 'submit',
  toolDescription: 'submit',
  inputSchema: { type: 'object' as const, properties: {} },
  schema: z.object({ ok: z.boolean() }),
  maxTokens: 100,
}

describe('callTool', () => {
  beforeEach(() => {
    createMock.mockReset()
    process.env.ANTHROPIC_API_KEY = 'test-key'
  })

  it('reports a failed API call instead of throwing', async () => {
    createMock.mockRejectedValue(Object.assign(new Error('Overloaded'), { status: 529 }))

    const outcome = await callTool(params)

    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.error).toBe('API call failed — HTTP 529: Overloaded')
  })

  it('reports a network error without a status', async () => {
    createMock.mockRejectedValue(new Error('fetch failed'))

    const outcome = await callTool(params)

    expect(outcome).toMatchObject({ ok: false, error: 'API call failed — fetch failed' })
  })

  it('reports a missing API key instead of throwing', async () => {
    delete process.env.ANTHROPIC_API_KEY

    const outcome = await callTool(params)

    expect(outcome).toMatchObject({ ok: false, error: 'ANTHROPIC_API_KEY is not set' })
    expect(createMock).not.toHaveBeenCalled()
  })

  it('keeps the usage of an earlier attempt when the retry fails', async () => {
    createMock
      .mockResolvedValueOnce({ content: [], usage: { input_tokens: 10, output_tokens: 5 }, stop_reason: 'end_turn' })
      .mockRejectedValueOnce(new Error('fetch failed'))

    const outcome = await callTool(params)

    expect(outcome).toMatchObject({ ok: false, usage: { inputTokens: 10, outputTokens: 5 } })
  })
})
