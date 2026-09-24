// Shared "force structured output via tool use, validate with zod, retry
// once" helper — used by backend/analyze.ts (vacancy triage/deep analysis) and
// backend/interview.ts (the profile interview). One place so the retry policy
// and error handling stay consistent, not slightly different in each file.
// Server-side only — never import this from client code.
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

export interface Usage {
  inputTokens: number
  outputTokens: number
}

export type LlmMessage = { role: 'user' | 'assistant'; content: string }

export type ToolCallOutcome<T> = { ok: true; result: T; usage: Usage } | { ok: false; error: string; usage: Usage }

function requireApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set')
  return key
}

export async function callTool<T>(params: {
  model: string
  systemPrompt: string
  messages: LlmMessage[]
  toolName: string
  toolDescription: string
  inputSchema: Anthropic.Tool.InputSchema
  schema: z.ZodType<T>
  maxTokens: number
}): Promise<ToolCallOutcome<T>> {
  const anthropic = new Anthropic({ apiKey: requireApiKey() })
  const totalUsage: Usage = { inputTokens: 0, outputTokens: 0 }
  let lastError = 'unknown error'

  // Retry once on a malformed/invalid response (rule: never crash the run).
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await anthropic.messages.create({
      model: params.model,
      max_tokens: params.maxTokens,
      system: params.systemPrompt,
      messages: params.messages,
      tools: [{ name: params.toolName, description: params.toolDescription, input_schema: params.inputSchema }],
      tool_choice: { type: 'tool', name: params.toolName },
    })

    totalUsage.inputTokens += response.usage.input_tokens
    totalUsage.outputTokens += response.usage.output_tokens

    // The reply hit max_tokens, so the tool input is cut off mid-JSON.
    // Retrying with the same limit would just fail the same way — stop and
    // say so plainly instead of a confusing schema error.
    if (response.stop_reason === 'max_tokens') {
      return {
        ok: false,
        error: `response was cut off at max_tokens (${params.maxTokens}) — raise maxTokens for "${params.toolName}"`,
        usage: totalUsage,
      }
    }

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use' && block.name === params.toolName
    )
    if (!toolUse) {
      lastError = `no "${params.toolName}" tool_use block in the response (stop_reason: ${response.stop_reason})`
      continue
    }

    const parsed = params.schema.safeParse(toolUse.input)
    if (parsed.success) {
      return { ok: true, result: parsed.data, usage: totalUsage }
    }
    lastError = `schema validation failed on attempt ${attempt}: ${parsed.error.message}`
  }

  return { ok: false, error: lastError, usage: totalUsage }
}
