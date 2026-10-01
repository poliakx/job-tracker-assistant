import React from 'react'
import type { ContactInfo, ResumeContent } from '@/types'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-900 border-b border-gray-300 pb-0.5 mb-2 mt-4">{children}</h2>
}

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

// The resume itself: a single-column, ATS-friendly layout (plain text,
// real headings, no tables or icons a parser could choke on). Printed via
// the browser's "Save as PDF" — see the @media print rules in globals.css.
// `editable` lets the owner tweak wording right on the page before
// printing; those edits aren't saved anywhere.
export default function ResumeDocument({
  content,
  contact,
  editable,
}: {
  content: ResumeContent
  contact: ContactInfo
  editable: boolean
}) {
  const links = [contact.email, contact.phone, contact.linkedin, contact.github, contact.portfolio].filter(Boolean).map(stripProtocol)

  return (
    <article
      contentEditable={editable}
      suppressContentEditableWarning
      className="bg-white text-gray-900 mx-auto w-full max-w-[210mm] px-8 sm:px-12 py-10 shadow-sm ring-1 ring-gray-200 print:shadow-none print:ring-0 print:p-0 print:max-w-none text-[10.5pt] leading-snug outline-none"
    >
      <header className="text-center">
        <h1 className="text-[20pt] font-bold tracking-tight leading-tight">{contact.fullName || 'Your Name'}</h1>
        <p className="text-[11pt] text-gray-700 mt-0.5">{content.headline}</p>
        {links.length > 0 && <p className="text-[9.5pt] text-gray-600 mt-1">{links.join('  ·  ')}</p>}
      </header>

      {content.summary && (
        <>
          <SectionTitle>Summary</SectionTitle>
          <p>{content.summary}</p>
        </>
      )}

      {content.skills.length > 0 && (
        <>
          <SectionTitle>Skills</SectionTitle>
          <ul className="space-y-0.5">
            {content.skills.map(s => (
              <li key={s.category}>
                <span className="font-semibold">{s.category}:</span> {s.items.join(', ')}
              </li>
            ))}
          </ul>
        </>
      )}

      {content.experience.length > 0 && (
        <>
          <SectionTitle>Experience</SectionTitle>
          <div className="space-y-2.5">
            {content.experience.map((e, i) => (
              <section key={i} className="break-inside-avoid">
                <div className="flex justify-between gap-4">
                  <span>
                    <span className="font-semibold">{e.title}</span>
                    {e.company && <> — {e.company}</>}
                    {e.location && <span className="text-gray-600">, {e.location}</span>}
                  </span>
                  <span className="text-gray-600 whitespace-nowrap">{e.period}</span>
                </div>
                <ul className="list-disc pl-5 mt-0.5 space-y-0.5">
                  {e.bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      {content.projects.length > 0 && (
        <>
          <SectionTitle>Projects</SectionTitle>
          <div className="space-y-2.5">
            {content.projects.map((p, i) => (
              <section key={i} className="break-inside-avoid">
                <div className="flex justify-between gap-4">
                  <span>
                    <span className="font-semibold">{p.name}</span>
                    {p.tech.length > 0 && <span className="text-gray-600"> | {p.tech.join(', ')}</span>}
                  </span>
                  {p.url && <span className="text-gray-600 whitespace-nowrap">{stripProtocol(p.url)}</span>}
                </div>
                <ul className="list-disc pl-5 mt-0.5 space-y-0.5">
                  {p.bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      {content.education.length > 0 && (
        <>
          <SectionTitle>Education</SectionTitle>
          <div className="space-y-1">
            {content.education.map((e, i) => (
              <div key={i} className="break-inside-avoid">
                <div className="flex justify-between gap-4">
                  <span>
                    <span className="font-semibold">{e.degree}</span>
                    {e.institution && <> — {e.institution}</>}
                  </span>
                  <span className="text-gray-600 whitespace-nowrap">{e.period}</span>
                </div>
                {e.details && <p className="text-gray-700">{e.details}</p>}
              </div>
            ))}
          </div>
        </>
      )}

      {content.certifications.length > 0 && (
        <>
          <SectionTitle>Certifications</SectionTitle>
          <ul className="list-disc pl-5 space-y-0.5">
            {content.certifications.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </>
      )}

      {content.languages.length > 0 && (
        <>
          <SectionTitle>Languages</SectionTitle>
          <p>{content.languages.join('  ·  ')}</p>
        </>
      )}
    </article>
  )
}
