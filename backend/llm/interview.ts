// The AI profile interview: a short back-and-forth (interviewStep) that
// gathers the candidate's real background, then one call (extractProfile)
// that turns the transcript into a structured CandidateProfile for the
// owner to review before saving. Server-side only — never import this from
// client code.
import type Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { CandidateProfileSchema } from '../profile'
import { EXTRACT_PROFILE_SYSTEM_PROMPT, INTERVIEW_SYSTEM_PROMPT, buildExtractProfileUserMessage } from './prompts/interview'
import { callTool, type LlmMessage, type ToolCallOutcome } from './llmTool'
import type { CandidateProfile } from '@/types'

export const InterviewStepSchema = z.object({
  message: z.string(),
  done: z.boolean(),
})
export type InterviewStepResult = z.infer<typeof InterviewStepSchema>

const INTERVIEW_STEP_INPUT_SCHEMA: Anthropic.Tool.InputSchema = {
  type: 'object',
  properties: {
    message: { type: 'string', description: 'What to say to the candidate next — the next question, or a short wrap-up if done.' },
    done: { type: 'boolean', description: 'true once you have enough information to build a complete profile.' },
  },
  required: ['message', 'done'],
}

// Mirrors CandidateProfileSchema (backend/profile.ts) field-for-field, same
// hand-written-JSON-schema-alongside-zod convention as backend/analyze.ts.
const PROFILE_INPUT_SCHEMA: Anthropic.Tool.InputSchema = {
  type: 'object',
  properties: {
    level: { type: 'string' },
    location: {
      type: 'object',
      properties: {
        city: { type: 'string' },
        country: { type: 'string' },
        openToRemote: { type: 'boolean' },
      },
      required: ['city', 'country', 'openToRemote'],
    },
    languages: { type: 'array', items: { type: 'string' } },
    stack: {
      type: 'object',
      properties: {
        backend: { type: 'array', items: { type: 'string' } },
        frontend: { type: 'array', items: { type: 'string' } },
        alsoKnows: { type: 'array', items: { type: 'string' } },
      },
      required: ['backend', 'frontend', 'alsoKnows'],
    },
    experience: { type: 'string', description: 'Keep commercial/project/internship/self-study explicitly distinguishable.' },
    targetRoles: { type: 'array', items: { type: 'string', enum: ['BACKEND', 'FRONTEND', 'FULLSTACK', 'INTERNSHIP'] } },
    resumeVersions: {
      type: 'object',
      properties: {
        FULLSTACK: { type: 'string' },
        BACKEND: { type: 'string' },
        FRONTEND: { type: 'string' },
      },
      required: ['FULLSTACK', 'BACKEND', 'FRONTEND'],
    },
    filterPolicy: {
      type: 'object',
      properties: {
        hardRejectTitleKeywords: { type: 'array', items: { type: 'string' } },
        flagIfRequiredYearsAbove: { type: 'integer' },
        conflictingStackKeywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Languages/frameworks the candidate explicitly said they do not know.',
        },
      },
      required: ['hardRejectTitleKeywords', 'flagIfRequiredYearsAbove', 'conflictingStackKeywords'],
    },
  },
  required: ['level', 'location', 'languages', 'stack', 'experience', 'targetRoles', 'resumeVersions', 'filterPolicy'],
}

// messages is the conversation so far (owner's replies + the interviewer's
// past "message" text as assistant turns). Empty on the very first call —
// a synthetic starter turn kicks Claude off since the Messages API requires
// the first message to have role "user".
export async function interviewStep(
  messages: LlmMessage[],
  model: string = process.env.ANALYSIS_MODEL_DEEP ?? 'claude-sonnet-5'
): Promise<ToolCallOutcome<InterviewStepResult>> {
  const effectiveMessages: LlmMessage[] = messages.length > 0 ? messages : [{ role: 'user', content: "Let's start." }]
  return callTool({
    model,
    systemPrompt: INTERVIEW_SYSTEM_PROMPT,
    messages: effectiveMessages,
    toolName: 'submit_interview_step',
    toolDescription: 'Submit your next message to the candidate and whether the interview is complete.',
    inputSchema: INTERVIEW_STEP_INPUT_SCHEMA,
    schema: InterviewStepSchema,
    // Ukrainian text costs ~2x the tokens of English, and a recap-style turn
    // measured ~500 tokens — the old 500 limit cut replies off mid-JSON.
    // "Keep it short" is the prompt's job; this is only a safety ceiling.
    maxTokens: 2000,
  })
}

export async function extractProfile(
  transcript: LlmMessage[],
  model: string = process.env.ANALYSIS_MODEL_DEEP ?? 'claude-sonnet-5'
): Promise<ToolCallOutcome<CandidateProfile>> {
  return callTool({
    model,
    systemPrompt: EXTRACT_PROFILE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildExtractProfileUserMessage(transcript) }],
    toolName: 'submit_profile',
    toolDescription: 'Submit the structured candidate profile extracted from the interview transcript.',
    inputSchema: PROFILE_INPUT_SCHEMA,
    schema: CandidateProfileSchema,
    maxTokens: 4000,
  })
}
