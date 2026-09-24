// Two-stage LLM analysis: a cheap triage pass (yes/no, one model call) that
// decides whether a vacancy is worth the more expensive deep analysis.
// Server-side only — never import this from client code.
import type Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { buildDeepSystemPrompt, buildTriageSystemPrompt, buildVacancyUserMessage } from './prompts/analyze'
import { callTool, type ToolCallOutcome } from './llmTool'
import type { CandidateProfile } from '@/types'

export const TriageResultSchema = z.object({
  worthDeepAnalysis: z.boolean(),
  reason: z.string(),
})
export type TriageResult = z.infer<typeof TriageResultSchema>

// Mirrors PLAN.md's deep analysis schema exactly.
export const DeepAnalysisSchema = z.object({
  fitScore: z.number().min(0).max(100),
  verdict: z.enum(['STRONG', 'MAYBE', 'WEAK']),
  summary: z.string(),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  redFlags: z.array(z.string()),
  seniorityAssessment: z.enum(['INTERN', 'JUNIOR', 'JUNIOR_PLUS', 'MID', 'SENIOR']),
  languageRequirements: z.array(z.string()),
  suggestedResume: z.enum(['FULLSTACK', 'BACKEND', 'FRONTEND']),
  suggestedResumeReason: z.string(),
  applyAdvice: z.string(),
})
export type DeepAnalysisResult = z.infer<typeof DeepAnalysisSchema>

export type { Usage } from './llmTool'
export type AnalysisOutcome<T> = ToolCallOutcome<T>

export interface VacancyForAnalysis {
  title: string
  company: string
  description: string
}

// JSON Schema for the tool's input — enforces structured output, matches
// the zod schemas above field-for-field. Hand-written rather than derived
// (no zod-to-json-schema dependency) since these two schemas are small and
// fixed.
const TRIAGE_INPUT_SCHEMA: Anthropic.Tool.InputSchema = {
  type: 'object',
  properties: {
    worthDeepAnalysis: { type: 'boolean' },
    reason: { type: 'string', description: 'One sentence explaining the decision.' },
  },
  required: ['worthDeepAnalysis', 'reason'],
}

const DEEP_INPUT_SCHEMA: Anthropic.Tool.InputSchema = {
  type: 'object',
  properties: {
    fitScore: { type: 'integer', minimum: 0, maximum: 100 },
    verdict: { type: 'string', enum: ['STRONG', 'MAYBE', 'WEAK'] },
    summary: { type: 'string', description: '2-3 sentences, in Ukrainian.' },
    matchedSkills: { type: 'array', items: { type: 'string' } },
    missingSkills: { type: 'array', items: { type: 'string' } },
    redFlags: { type: 'array', items: { type: 'string' } },
    seniorityAssessment: { type: 'string', enum: ['INTERN', 'JUNIOR', 'JUNIOR_PLUS', 'MID', 'SENIOR'] },
    languageRequirements: { type: 'array', items: { type: 'string' } },
    suggestedResume: { type: 'string', enum: ['FULLSTACK', 'BACKEND', 'FRONTEND'] },
    suggestedResumeReason: { type: 'string' },
    applyAdvice: { type: 'string' },
  },
  required: [
    'fitScore',
    'verdict',
    'summary',
    'matchedSkills',
    'missingSkills',
    'redFlags',
    'seniorityAssessment',
    'languageRequirements',
    'suggestedResume',
    'suggestedResumeReason',
    'applyAdvice',
  ],
}

function callVacancyTool<T>(params: {
  model: string
  systemPrompt: string
  userMessage: string
  toolName: string
  toolDescription: string
  inputSchema: Anthropic.Tool.InputSchema
  schema: z.ZodType<T>
  maxTokens: number
}): Promise<ToolCallOutcome<T>> {
  return callTool({ ...params, messages: [{ role: 'user', content: params.userMessage }] })
}

export async function triageVacancy(
  vacancy: VacancyForAnalysis,
  profile: CandidateProfile,
  model: string = process.env.ANALYSIS_MODEL_TRIAGE ?? 'claude-haiku-4-5-20251001'
): Promise<AnalysisOutcome<TriageResult>> {
  return callVacancyTool({
    model,
    systemPrompt: buildTriageSystemPrompt(profile),
    userMessage: buildVacancyUserMessage(vacancy),
    toolName: 'submit_triage',
    toolDescription: 'Submit the triage decision for this vacancy.',
    inputSchema: TRIAGE_INPUT_SCHEMA,
    schema: TriageResultSchema,
    maxTokens: 300,
  })
}

export async function analyzeVacancyDeep(
  vacancy: VacancyForAnalysis,
  profile: CandidateProfile,
  model: string = process.env.ANALYSIS_MODEL_DEEP ?? 'claude-sonnet-5'
): Promise<AnalysisOutcome<DeepAnalysisResult>> {
  return callVacancyTool({
    model,
    systemPrompt: buildDeepSystemPrompt(profile),
    userMessage: buildVacancyUserMessage(vacancy),
    toolName: 'submit_analysis',
    toolDescription: 'Submit the completed vacancy analysis.',
    inputSchema: DEEP_INPUT_SCHEMA,
    schema: DeepAnalysisSchema,
    maxTokens: 1500,
  })
}
