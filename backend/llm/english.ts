// The English assessment's LLM steps: generate a fresh test, run the chat
// part, and evaluate everything into CEFR levels. Quiz scoring itself is
// done in code (backend/english.ts). Server-side only — never import this
// from client code.
import type Anthropic from '@anthropic-ai/sdk'
import { EnglishAssessmentResultSchema, EnglishTestSchema } from '../english'
import { InterviewStepSchema, type InterviewStepResult } from './interview'
import {
  CONVERSATION_SYSTEM_PROMPT,
  EVALUATE_SYSTEM_PROMPT,
  GENERATE_TEST_SYSTEM_PROMPT,
  buildEvaluateUserMessage,
} from './prompts/english'
import { callTool, type LlmMessage, type ToolCallOutcome } from './llmTool'
import type { EnglishAssessmentResult, EnglishTest, QuizScore, WritingTask } from '@/types'

const CEFR_ENUM = { type: 'string', enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] } as const
const STRING_LIST = { type: 'array', items: { type: 'string' } } as const

const TEST_INPUT_SCHEMA: Anthropic.Tool.InputSchema = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          level: CEFR_ENUM,
          skill: { type: 'string', enum: ['GRAMMAR', 'VOCABULARY', 'READING'] },
          passage: { type: 'string', description: 'READING only; empty string otherwise.' },
          prompt: { type: 'string' },
          options: { ...STRING_LIST, description: 'Exactly 4 options.' },
          answerIndex: { type: 'integer', minimum: 0, maximum: 3 },
          explanation: { type: 'string', description: 'In Ukrainian, one sentence.' },
        },
        required: ['id', 'level', 'skill', 'passage', 'prompt', 'options', 'answerIndex', 'explanation'],
      },
    },
    writingTasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          prompt: { type: 'string' },
          minWords: { type: 'integer' },
          maxWords: { type: 'integer' },
        },
        required: ['id', 'prompt', 'minWords', 'maxWords'],
      },
    },
  },
  required: ['questions', 'writingTasks'],
}

const CONVERSATION_STEP_INPUT_SCHEMA: Anthropic.Tool.InputSchema = {
  type: 'object',
  properties: {
    message: { type: 'string', description: 'Your next chat message, in English.' },
    done: { type: 'boolean', description: 'true once the chat is finished.' },
  },
  required: ['message', 'done'],
}

const EVALUATION_INPUT_SCHEMA: Anthropic.Tool.InputSchema = {
  type: 'object',
  properties: {
    overall: CEFR_ENUM,
    skills: {
      type: 'object',
      properties: {
        grammar: CEFR_ENUM,
        vocabulary: CEFR_ENUM,
        reading: CEFR_ENUM,
        writing: CEFR_ENUM,
        interaction: CEFR_ENUM,
      },
      required: ['grammar', 'vocabulary', 'reading', 'writing', 'interaction'],
    },
    summary: { type: 'string' },
    strengths: STRING_LIST,
    mistakes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          original: { type: 'string', description: "Verbatim from the candidate's text." },
          correction: { type: 'string' },
          explanation: { type: 'string' },
        },
        required: ['original', 'correction', 'explanation'],
      },
    },
    recommendations: STRING_LIST,
  },
  required: ['overall', 'skills', 'summary', 'strengths', 'mistakes', 'recommendations'],
}

const DEFAULT_MODEL = () => process.env.ANALYSIS_MODEL_DEEP ?? 'claude-sonnet-5'

export async function generateEnglishTest(model: string = DEFAULT_MODEL()): Promise<ToolCallOutcome<EnglishTest>> {
  const outcome = await callTool({
    model,
    systemPrompt: GENERATE_TEST_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: 'Generate a new placement test.' }],
    toolName: 'submit_test',
    toolDescription: 'Submit the generated placement test.',
    inputSchema: TEST_INPUT_SCHEMA,
    schema: EnglishTestSchema,
    maxTokens: 8000,
  })
  if (!outcome.ok) return outcome
  // Stable ids regardless of what the model picked (it sometimes repeats them).
  const test: EnglishTest = {
    questions: outcome.result.questions.map((q, i) => ({ ...q, id: `q${i + 1}` })),
    writingTasks: outcome.result.writingTasks.map((t, i) => ({ ...t, id: `w${i + 1}` })),
  }
  return { ...outcome, result: test }
}

export async function englishConversationStep(
  messages: LlmMessage[],
  model: string = DEFAULT_MODEL()
): Promise<ToolCallOutcome<InterviewStepResult>> {
  const effectiveMessages: LlmMessage[] = messages.length > 0 ? messages : [{ role: 'user', content: "Let's start." }]
  return callTool({
    model,
    systemPrompt: CONVERSATION_SYSTEM_PROMPT,
    messages: effectiveMessages,
    toolName: 'submit_chat_message',
    toolDescription: 'Submit your next chat message and whether the chat is finished.',
    inputSchema: CONVERSATION_STEP_INPUT_SCHEMA,
    schema: InterviewStepSchema,
    maxTokens: 1000,
  })
}

export async function evaluateEnglish(
  params: {
    test: EnglishTest
    score: QuizScore
    writing: { task: WritingTask; text: string }[]
    conversation: LlmMessage[]
  },
  model: string = DEFAULT_MODEL()
): Promise<ToolCallOutcome<EnglishAssessmentResult>> {
  return callTool({
    model,
    systemPrompt: EVALUATE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildEvaluateUserMessage(params) }],
    toolName: 'submit_assessment',
    toolDescription: 'Submit the English level assessment.',
    inputSchema: EVALUATION_INPUT_SCHEMA,
    schema: EnglishAssessmentResultSchema,
    maxTokens: 4000,
  })
}
