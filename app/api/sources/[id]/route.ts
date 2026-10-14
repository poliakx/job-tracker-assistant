import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { deleteSourceConfig, setSourceConfigEnabled } from '@/backend/vacancies/sources/repository'

const PatchSchema = z.object({ enabled: z.boolean() })

function isNotFound(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025'
}

// PATCH /api/sources/:id { enabled } — switch a UI-configured source on/off.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'expected { enabled: boolean }' }, { status: 400 })
  try {
    return NextResponse.json(await setSourceConfigEnabled(params.id, parsed.data.enabled))
  } catch (e) {
    if (isNotFound(e)) return NextResponse.json({ error: 'source not found' }, { status: 404 })
    return NextResponse.json({ error: 'failed to update the source' }, { status: 500 })
  }
}

// DELETE /api/sources/:id — remove a UI-configured source. Vacancies it
// already brought in are kept.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await deleteSourceConfig(params.id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (isNotFound(e)) return NextResponse.json({ error: 'source not found' }, { status: 404 })
    return NextResponse.json({ error: 'failed to delete the source' }, { status: 500 })
  }
}
