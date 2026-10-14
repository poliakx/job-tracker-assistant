import { NextRequest, NextResponse } from 'next/server'
import { ApplicationSource, ApplicationStatus } from '@prisma/client'
import { z } from 'zod'
import { getApplications, createApplication, updateApplication, deleteApplication } from '@/backend/db'

// A date from an <input type="date"> ("2026-10-14") or a full ISO
// timestamp, as the API returns it.
const DateString = z.string().refine(s => !Number.isNaN(Date.parse(s)), 'invalid date')
// Optional fields: the form sends "" for an empty one, which clears it.
const OptionalDate = z.union([DateString, z.literal(''), z.null()]).optional()
const OptionalText = z.string().max(5000).nullable().optional()

const ApplicationFields = z.object({
  company: z.string().trim().min(1).max(200),
  position: z.string().trim().min(1).max(200),
  jobUrl: OptionalText,
  status: z.enum(ApplicationStatus),
  source: z.enum(ApplicationSource),
  appliedDate: DateString,
  followUpDate: OptionalDate,
  contactPerson: OptionalText,
  notes: OptionalText,
})

// Unknown keys (id, createdAt, …) are stripped by zod.
const CreateSchema = ApplicationFields
const PatchSchema = ApplicationFields.partial().extend({ id: z.string().min(1) })

function invalid(error: z.ZodError) {
  const issue = error.issues[0]
  return NextResponse.json({ error: 'invalid application', details: issue ? `${issue.path.join('.')}: ${issue.message}` : undefined }, { status: 400 })
}

// The validated fields with "" / null optional values turned into
// undefined — the shape backend/db expects.
function clean<T extends Record<string, unknown>>(data: T) {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === '' || v === null ? undefined : v])) as {
    [K in keyof T]: Exclude<T[K], null | ''>
  }
}

export async function GET() {
  try {
    const apps = await getApplications()
    return NextResponse.json(apps)
  } catch (e) {
    return NextResponse.json({ error: 'failed to load' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const parsed = CreateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return invalid(parsed.error)
  try {
    const created = await createApplication(clean(parsed.data))
    return NextResponse.json(created)
  } catch (e) {
    return NextResponse.json({ error: 'failed to create' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return invalid(parsed.error)
  const { id, ...patch } = parsed.data
  try {
    // Here "" must reach the db layer as an explicit clear, not be dropped:
    // only null becomes "" so updateApplication sets the column to null.
    const fields = Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, v === null ? '' : v]))
    const updated = await updateApplication(id, fields)
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: 'failed to update' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
    await deleteApplication(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'failed to delete' }, { status: 500 })
  }
}
