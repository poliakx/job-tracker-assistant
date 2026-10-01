// Resume content: zod schema for the LLM output, plus a deterministic
// honesty check run on every generated resume. No LLM calls here — see
// backend/llm/resume.ts.
import { z } from 'zod'
import type { CandidateProfile, ResumeContent } from '@/types'

export const ResumeContentSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  skills: z.array(z.object({ category: z.string(), items: z.array(z.string()) })),
  experience: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      location: z.string(),
      period: z.string(),
      bullets: z.array(z.string()),
    })
  ),
  projects: z.array(z.object({ name: z.string(), url: z.string(), tech: z.array(z.string()), bullets: z.array(z.string()) })),
  education: z.array(z.object({ institution: z.string(), degree: z.string(), period: z.string(), details: z.string() })),
  certifications: z.array(z.string()),
  languages: z.array(z.string()),
})

export const GeneratedResumeSchema = z.object({
  resume: ResumeContentSchema,
  changes: z.array(z.string()),
})

// "Node.js", "NodeJS" and "node js" all compare equal, and so do "REST API"
// and "REST APIs"; "C#"/"C++" keep their symbols so they don't collapse
// into "C".
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9+#]/g, '')
    .replace(/s$/, '')
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Every skill/tech the resume lists must be backed by the profile: equal to
// a term in one of its stack/tech lists, or appearing as a whole word in
// its free text (so "Java" is not backed by "JavaScript"). The prompt
// already says so; this catches the model slipping in a vacancy's
// requirement the candidate never mentioned — returned so the UI can warn.
// filterPolicy (what the candidate does NOT know) and contact details
// never count as evidence.
export function findUnsupportedSkills(resume: ResumeContent, profile: CandidateProfile): string[] {
  const listTerms = new Set(
    [
      ...profile.stack.backend,
      ...profile.stack.frontend,
      ...profile.stack.alsoKnows,
      ...profile.workExperience.flatMap(w => w.tech),
      ...profile.projects.flatMap(p => p.tech),
    ].map(normalize)
  )
  const freeText = [
    profile.level,
    profile.experience,
    profile.headline,
    profile.about,
    ...profile.workExperience.flatMap(w => [w.title, w.description, ...w.achievements]),
    ...profile.projects.flatMap(p => [p.description, ...p.achievements]),
    ...profile.education.flatMap(e => [e.field, e.details]),
    ...profile.certifications.map(c => c.name),
  ]
    .join('\n')
    .toLowerCase()

  const isBacked = (item: string) => {
    if (listTerms.has(normalize(item))) return true
    const phrase = escapeRegExp(item.toLowerCase().trim())
    return new RegExp(`(^|[^a-z0-9+#])${phrase}($|[^a-z0-9+#])`).test(freeText)
  }

  const listed = [...resume.skills.flatMap(s => s.items), ...resume.projects.flatMap(p => p.tech)]
  return Array.from(new Set(listed.filter(item => normalize(item).length > 0 && !isBacked(item))))
}
