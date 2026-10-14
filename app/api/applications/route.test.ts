import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getApplications = vi.fn()
const createApplication = vi.fn()
const updateApplication = vi.fn()
const deleteApplication = vi.fn()

vi.mock('@/backend/db', () => ({ getApplications, createApplication, updateApplication, deleteApplication }))

const { PATCH, POST } = await import('./route')

function request(method: string, body: unknown) {
  return new NextRequest('http://localhost/api/applications', { method, body: JSON.stringify(body) })
}

const valid = {
  company: 'Acme',
  position: 'Junior Developer',
  jobUrl: '',
  status: 'applied',
  source: 'linkedin',
  appliedDate: '2026-10-01',
  followUpDate: '',
  contactPerson: '',
  notes: '',
}

describe('POST /api/applications', () => {
  beforeEach(() => {
    createApplication.mockReset()
    createApplication.mockImplementation(async data => ({ id: 'a1', ...data }))
  })

  it('creates an application, turning empty optional fields into undefined', async () => {
    const res = await POST(request('POST', valid))
    expect(res.status).toBe(200)
    expect(createApplication).toHaveBeenCalledWith({
      company: 'Acme',
      position: 'Junior Developer',
      jobUrl: undefined,
      status: 'applied',
      source: 'linkedin',
      appliedDate: '2026-10-01',
      followUpDate: undefined,
      contactPerson: undefined,
      notes: undefined,
    })
  })

  it('rejects an invalid status or date with 400', async () => {
    expect((await POST(request('POST', { ...valid, status: 'hired' }))).status).toBe(400)
    expect((await POST(request('POST', { ...valid, appliedDate: 'yesterday' }))).status).toBe(400)
    expect((await POST(request('POST', { ...valid, company: '' }))).status).toBe(400)
    expect(createApplication).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/applications', () => {
  beforeEach(() => {
    updateApplication.mockReset()
    updateApplication.mockResolvedValue({ id: 'a1' })
  })

  it('requires an id', async () => {
    const res = await PATCH(request('PATCH', { status: 'offer' }))
    expect(res.status).toBe(400)
    expect(updateApplication).not.toHaveBeenCalled()
  })

  it('accepts the full edited form: drops id/timestamps, keeps "" so a field can be cleared', async () => {
    const res = await PATCH(
      request('PATCH', {
        ...valid,
        id: 'a1',
        appliedDate: '2026-10-01T00:00:00.000Z',
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
      })
    )
    expect(res.status).toBe(200)
    const [id, patch] = updateApplication.mock.calls[0]
    expect(id).toBe('a1')
    expect(patch).not.toHaveProperty('createdAt')
    expect(patch).not.toHaveProperty('updatedAt')
    expect(patch).not.toHaveProperty('id')
    expect(patch.followUpDate).toBe('')
    expect(patch.appliedDate).toBe('2026-10-01T00:00:00.000Z')
  })

  it('treats null like an empty field', async () => {
    await PATCH(request('PATCH', { id: 'a1', followUpDate: null, notes: null }))
    expect(updateApplication).toHaveBeenCalledWith('a1', { followUpDate: '', notes: '' })
  })

  it('accepts a status-only patch (the auto no_answer update)', async () => {
    await PATCH(request('PATCH', { id: 'a1', status: 'no_answer' }))
    expect(updateApplication).toHaveBeenCalledWith('a1', { status: 'no_answer' })
  })

  it('rejects an invalid followUpDate with 400', async () => {
    const res = await PATCH(request('PATCH', { id: 'a1', followUpDate: 'soon' }))
    expect(res.status).toBe(400)
  })
})
