import React from 'react'
import ResumeWorkspace from '@/frontend/components/resume/ResumeWorkspace'

// The base resume, built from the profile.
export default function ResumePage() {
  return <ResumeWorkspace apiPath="/api/resume" />
}
