// The AI profile interview: a short back-and-forth (interviewStep) that
// gathers the candidate's real background, then one call (extractProfile)
// that turns the transcript into a structured CandidateProfile for the
// owner to review before saving. Server-side only — never import this from
// client code.
import type Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { CandidateProfileSchema } from '@/backend/profile/schema'
import {
  EXTRACT_PROFILE_SYSTEM_PROMPT,
  INTERVIEW_SYSTEM_PROMPT,
  buildExtractProfileUserMessage,
  buildUpdateExtractSystemPrompt,
  buildUpdateInterviewSystemPrompt,
} from './prompts'
import { callTool, type LlmMessage, type ToolCallOutcome } from '@/backend/shared/llm/callTool'
import type { CandidateProfile, EnglishAssessmentResult } from '@/types'

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

const STRING_LIST = { type: 'array', items: { type: 'string' } } as const

// Mirrors CandidateProfileSchema (backend/profile/schema.ts) field-for-field, same
// hand-written-JSON-schema-alongside-zod convention as backend/vacancies/analysis/analyze.ts —
// except `contact`, which the LLM never sees or fills (see extractProfile).
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
    headline: { type: 'string', description: 'One line, e.g. "Junior Full-Stack Developer (Node.js / React)".' },
    about: { type: 'string', description: 'What the candidate said about themselves and what they want next.' },
    workExperience: {
      type: 'array',
      description: 'Paid/structured work only. Personal, team, academic projects go into projects.',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          company: { type: 'string' },
          location: { type: 'string' },
          kind: { type: 'string', enum: ['COMMERCIAL', 'INTERNSHIP', 'FREELANCE', 'VOLUNTEER'] },
          startDate: { type: 'string', description: 'As stated, e.g. "03.2024" or "2023"; empty if unknown.' },
          endDate: { type: 'string', description: '"Present" if ongoing; empty if unknown.' },
          description: { type: 'string' },
          achievements: { ...STRING_LIST, description: 'Only concrete things the candidate described.' },
          tech: STRING_LIST,
        },
        required: ['title', 'company', 'location', 'kind', 'startDate', 'endDate', 'description', 'achievements', 'tech'],
      },
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          kind: { type: 'string', enum: ['PERSONAL', 'TEAM', 'ACADEMIC', 'OPEN_SOURCE', 'HACKATHON'] },
          role: { type: 'string' },
          description: { type: 'string' },
          achievements: STRING_LIST,
          tech: STRING_LIST,
          url: { type: 'string', description: 'The main link: the live demo, or the main repository.' },
          links: {
            ...STRING_LIST,
            description: 'Any further links to this same project, e.g. the second repository when the frontend and backend live in separate repos.',
          },
        },
        required: ['name', 'kind', 'role', 'description', 'achievements', 'tech', 'url', 'links'],
      },
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          institution: { type: 'string' },
          degree: { type: 'string' },
          field: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          details: { type: 'string' },
        },
        required: ['institution', 'degree', 'field', 'startDate', 'endDate', 'details'],
      },
    },
    certifications: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, issuer: { type: 'string' }, date: { type: 'string' } },
        required: ['name', 'issuer', 'date'],
      },
    },
    languageLevels: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          language: { type: 'string' },
          level: { type: 'string', description: 'CEFR (A1–C2) or "native", as stated.' },
        },
        required: ['language', 'level'],
      },
    },
    workAuthorization: { type: 'string', description: 'Right to work / visa situation, as stated; empty if not discussed.' },
    availability: { type: 'string', description: 'Start date, full-/part-time, as stated; empty if not discussed.' },
  },
  required: [
    'level',
    'location',
    'languages',
    'stack',
    'experience',
    'targetRoles',
    'resumeVersions',
    'filterPolicy',
    'headline',
    'about',
    'workExperience',
    'projects',
    'education',
    'certifications',
    'languageLevels',
    'workAuthorization',
    'availability',
  ],
}

// messages is the conversation so far (owner's replies + the interviewer's
// past "message" text as assistant turns). Empty on the very first call —
// a synthetic starter turn kicks Claude off since the Messages API requires
// the first message to have role "user". Pass `existing` to run a follow-up
// interview that fills gaps in an already-saved profile (and `english`, the
// latest English test result, so it can point out a mismatch with it).
export async function interviewStep(
  messages: LlmMessage[],
  existing?: CandidateProfile,
  english: EnglishAssessmentResult | null = null,
  model: string = process.env.ANALYSIS_MODEL_DEEP ?? 'claude-sonnet-5'
): Promise<ToolCallOutcome<InterviewStepResult>> {
  const effectiveMessages: LlmMessage[] = messages.length > 0 ? messages : [{ role: 'user', content: "Let's start." }]
  return callTool({
    model,
    systemPrompt: existing ? buildUpdateInterviewSystemPrompt(existing, english) : INTERVIEW_SYSTEM_PROMPT,
    messages: effectiveMessages,
    toolName: 'submit_interview_step',
    toolDescription: 'Submit your next message to the candidate and whether the interview is complete.',
    inputSchema: INTERVIEW_STEP_INPUT_SCHEMA,
    schema: InterviewStepSchema,
    // Non-English replies (the interview answers in the candidate's language)
    // can cost ~2x the tokens of English, and a recap-style turn
    // measured ~500 tokens — the old 500 limit cut replies off mid-JSON.
    // "Keep it short" is the prompt's job; this is only a safety ceiling.
    maxTokens: 2000,
  })
}

// With `existing`, the transcript is a follow-up interview and the result
// is the saved profile updated with it. `contact` is always copied over
// from `existing` (or left empty) — the LLM never produces it.
export async function extractProfile(
  transcript: LlmMessage[],
  existing?: CandidateProfile,
  model: string = process.env.ANALYSIS_MODEL_DEEP ?? 'claude-sonnet-5'
): Promise<ToolCallOutcome<CandidateProfile>> {
  const outcome = await callTool({
    model,
    systemPrompt: existing ? buildUpdateExtractSystemPrompt(existing) : EXTRACT_PROFILE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildExtractProfileUserMessage(transcript) }],
    toolName: 'submit_profile',
    toolDescription: 'Submit the structured candidate profile extracted from the interview transcript.',
    inputSchema: PROFILE_INPUT_SCHEMA,
    schema: CandidateProfileSchema,
    // A full profile with several jobs and projects is a lot of JSON.
    maxTokens: 8000,
  })
  if (!outcome.ok || !existing) return outcome
  return { ...outcome, result: { ...outcome.result, contact: existing.contact } }
}
