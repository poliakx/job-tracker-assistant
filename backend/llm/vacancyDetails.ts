// Turns a vacancy the owner pasted in as one block of text into the fields
// a Vacancy row needs (title, company, …). Uses the cheap triage model —
// it's copying, not judging. Server-side only.
import type Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { EXTRACT_VACANCY_SYSTEM_PROMPT } from './prompts/vacancy'
import { callTool, type ToolCallOutcome } from './llmTool'

export const VacancyDetailsSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string(),
  remote: z.boolean().nullable(),
  url: z.string(),
})
export type VacancyDetails = z.infer<typeof VacancyDetailsSchema>

const DETAILS_INPUT_SCHEMA: Anthropic.Tool.InputSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    company: { type: 'string' },
    location: { type: 'string' },
    remote: { type: ['boolean', 'null'] },
    url: { type: 'string' },
  },
  required: ['title', 'company', 'location', 'remote', 'url'],
}

export async function extractVacancyDetails(
  text: string,
  model: string = process.env.ANALYSIS_MODEL_TRIAGE ?? 'claude-haiku-4-5-20251001'
): Promise<ToolCallOutcome<VacancyDetails>> {
  return callTool({
    model,
    systemPrompt: EXTRACT_VACANCY_SYSTEM_PROMPT,
    // The details are near the top of any posting; no need to send 30k chars.
    messages: [{ role: 'user', content: text.slice(0, 8000) }],
    toolName: 'submit_vacancy_details',
    toolDescription: 'Submit the details found in the pasted job posting.',
    inputSchema: DETAILS_INPUT_SCHEMA,
    schema: VacancyDetailsSchema,
    maxTokens: 400,
  })
}
