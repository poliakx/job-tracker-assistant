import { NextRequest, NextResponse } from 'next/server'
import { getApplications, createApplication, updateApplication, deleteApplication } from '@/backend/db'

export async function GET() {
  try {
    const apps = await getApplications()
    return NextResponse.json(apps)
  } catch (e) {
    return NextResponse.json({ error: 'failed to load' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const created = await createApplication(body)
    return NextResponse.json(created)
  } catch (e) {
    return NextResponse.json({ error: 'failed to create' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...patch } = body
    const updated = await updateApplication(id, patch)
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
