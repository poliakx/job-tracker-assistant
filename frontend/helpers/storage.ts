import { JobApplication } from '@/types'

const KEY = 'applications_v1'

export function loadApplications(): JobApplication[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw) as JobApplication[]
  } catch (e) {
    console.error('loadApplications error', e)
    return []
  }
}

export function saveApplications(apps: JobApplication[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(apps))
  } catch (e) {
    console.error('saveApplications error', e)
  }
}

// --- Profile interview draft ----------------------------------------------
// The interview lives only in React state until the profile is saved, so a
// reload or a crash mid-interview would lose every answer. Keep a draft in
// localStorage until the profile is saved (or the owner starts over).

const INTERVIEW_KEY = 'profile_interview_v1'

export type InterviewMessage = { role: 'user' | 'assistant'; content: string }

export interface InterviewDraft {
  messages: InterviewMessage[]
  // 'extracting' = the interview finished but the reload hit before the
  // profile was built — the page re-runs extraction on restore.
  phase: 'chat' | 'extracting' | 'review'
  profileJson: string
}

function isMessage(m: unknown): m is InterviewMessage {
  if (!m || typeof m !== 'object') return false
  const { role, content } = m as Record<string, unknown>
  return (role === 'user' || role === 'assistant') && typeof content === 'string'
}

export function loadInterviewDraft(): InterviewDraft | null {
  try {
    const raw = localStorage.getItem(INTERVIEW_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Record<string, unknown>
    if (!Array.isArray(data.messages) || !data.messages.every(isMessage)) return null
    return {
      messages: data.messages,
      phase: data.phase === 'review' || data.phase === 'extracting' ? data.phase : 'chat',
      profileJson: typeof data.profileJson === 'string' ? data.profileJson : '',
    }
  } catch (e) {
    console.error('loadInterviewDraft error', e)
    return null
  }
}

export function saveInterviewDraft(draft: InterviewDraft) {
  try {
    localStorage.setItem(INTERVIEW_KEY, JSON.stringify(draft))
  } catch (e) {
    console.error('saveInterviewDraft error', e)
  }
}

export function clearInterviewDraft() {
  try {
    localStorage.removeItem(INTERVIEW_KEY)
  } catch (e) {
    console.error('clearInterviewDraft error', e)
  }
}
