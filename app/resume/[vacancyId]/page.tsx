import React from 'react'
import ResumeWorkspace from '@/frontend/components/resume/ResumeWorkspace'

// A resume tailored to one vacancy.
export default function TailoredResumePage({ params }: { params: { vacancyId: string } }) {
  return <ResumeWorkspace apiPath={`/api/vacancies/${encodeURIComponent(params.vacancyId)}/resume`} />
}
