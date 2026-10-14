// Resume generation: the base resume from the profile, or a version
// tailored to one vacancy. Output is text sections only (ResumeContent);
// contact details are added at render time from the profile. Server-side
// only — never import this from client code.
import type Anthropic from '@anthropic-ai/sdk'
import { GeneratedResumeSchema } from '../resume'
import { buildBaseResumeSystemPrompt, buildTailoredResumeSystemPrompt } from './prompts/resume'
import { buildVacancyUserMessage } from './prompts/analyze'
import { callTool, type ToolCallOutcome } from './llmTool'
import type { VacancyForAnalysis } from './analyze'
import type { CandidateProfile, EnglishAssessmentResult, ResumeContent } from '@/types'

const STRING_LIST = { type: 'array', items: { type: 'string' } } as const

// Mirrors GeneratedResumeSchema (backend/resume.ts).
const RESUME_INPUT_SCHEMA: Anthropic.Tool.InputSchema = {
  type: 'object',
  properties: {
    resume: {
      type: 'object',
      properties: {
        headline: { type: 'string' },
        summary: { type: 'string' },
        skills: {
          type: 'array',
          items: {
            type: 'object',
            properties: { category: { type: 'string' }, items: STRING_LIST },
            required: ['category', 'items'],
          },
        },
        experience: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              company: { type: 'string' },
              location: { type: 'string' },
              period: { type: 'string' },
              bullets: STRING_LIST,
            },
            required: ['title', 'company', 'location', 'period', 'bullets'],
          },
        },
        projects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              url: { type: 'string' },
              links: { ...STRING_LIST, description: "The project's other links from the profile (e.g. a second repository)." },
              tech: STRING_LIST,
              bullets: STRING_LIST,
            },
            required: ['name', 'url', 'links', 'tech', 'bullets'],
          },
        },
        education: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              institution: { type: 'string' },
              degree: { type: 'string' },
              period: { type: 'string' },
              details: { type: 'string' },
            },
            required: ['institution', 'degree', 'period', 'details'],
          },
        },
        certifications: STRING_LIST,
        languages: STRING_LIST,
      },
      required: ['headline', 'summary', 'skills', 'experience', 'projects', 'education', 'certifications', 'languages'],
    },
    changes: STRING_LIST,
  },
  required: ['resume', 'changes'],
}

export interface GeneratedResume {
  resume: ResumeContent
  changes: string[]
}

// No vacancy = the base resume; with one = tailored to it.
export async function generateResume(
  profile: CandidateProfile,
  english: EnglishAssessmentResult | null,
  vacancy?: VacancyForAnalysis,
  model: string = process.env.ANALYSIS_MODEL_DEEP ?? 'claude-sonnet-5'
): Promise<ToolCallOutcome<GeneratedResume>> {
  return callTool({
    model,
    systemPrompt: vacancy ? buildTailoredResumeSystemPrompt(profile, english) : buildBaseResumeSystemPrompt(profile, english),
    messages: [
      {
        role: 'user',
        content: vacancy ? `Tailor the resume to this vacancy:\n\n${buildVacancyUserMessage(vacancy)}` : 'Write the base resume.',
      },
    ],
    toolName: 'submit_resume',
    toolDescription: 'Submit the resume content.',
    inputSchema: RESUME_INPUT_SCHEMA,
    schema: GeneratedResumeSchema,
    maxTokens: 6000,
  })
}
