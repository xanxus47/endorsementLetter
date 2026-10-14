import { sampleEndorsement } from './seed'
import type { Endorsement, EndorsementInput } from './schemas'

const SAMPLE_ID = 'sample'

export class EndorsementStore {
  private items = new Map<string, Endorsement>()

  constructor() {
    const now = new Date().toISOString()
    this.items.set(SAMPLE_ID, {
      id: SAMPLE_ID,
      ...structuredClone(sampleEndorsement),
      createdAt: now,
      updatedAt: now,
    })
  }

  list(): Endorsement[] {
    return [...this.items.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  get(id: string): Endorsement | undefined {
    return this.items.get(id)
  }

  create(input: EndorsementInput): Endorsement {
    const now = new Date().toISOString()
    const record: Endorsement = {
      id: crypto.randomUUID(),
      ...structuredClone(input),
      createdAt: now,
      updatedAt: now,
    }
    this.items.set(record.id, record)
    return record
  }

  update(id: string, input: EndorsementInput): Endorsement | undefined {
    const existing = this.items.get(id)
    if (!existing) return undefined

    const record: Endorsement = {
      ...structuredClone(input),
      id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    }
    this.items.set(id, record)
    return record
  }

  delete(id: string): boolean {
    return this.items.delete(id)
  }
}

export const store = new EndorsementStore()
