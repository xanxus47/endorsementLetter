import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import type { Endorsement, EndorsementInput, Item, Section } from './schemas'

export type Sql = NeonQueryFunction<false, false>

function connectionString(raw: string): string {
  const url = new URL(raw)
  url.searchParams.delete('channel_binding')
  if (!url.searchParams.has('sslmode')) url.searchParams.set('sslmode', 'require')
  return url.toString()
}

export function getSql(databaseUrl: string): Sql {
  return neon(connectionString(databaseUrl))
}

function asObject(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') return JSON.parse(value) as Record<string, unknown>
  return (value ?? {}) as Record<string, unknown>
}

function asArray(value: unknown): unknown[] {
  if (typeof value === 'string') return JSON.parse(value) as unknown[]
  return Array.isArray(value) ? value : []
}

function mapItem(raw: unknown): Item {
  const item = asObject(raw)
  return {
    item: String(item.item ?? ''),
    inQty: String(item.inQty ?? ''),
    used: String(item.used ?? ''),
    outQty: String(item.outQty ?? ''),
    notes: String(item.notes ?? ''),
  }
}

function mapSection(raw: unknown): Section {
  const section = asObject(raw)
  return {
    name: String(section.name ?? ''),
    items: asArray(section.items).map(mapItem),
  }
}

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  return new Date(String(value)).toISOString()
}

function mapLetter(row: Record<string, unknown>): Endorsement {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    team: String(row.team ?? ''),
    date: String(row.date ?? ''),
    time: String(row.time ?? ''),
    preparedBy: asObject(row.preparedBy) as Endorsement['preparedBy'],
    receivedBy: asObject(row.receivedBy) as Endorsement['receivedBy'],
    sections: asArray(row.sections).map(mapSection),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  }
}

async function insertSections(sql: Sql, letterId: string, sections: Section[]) {
  const payload = JSON.stringify(sections)
  await sql`
    WITH ins_sections AS (
      INSERT INTO letter_sections (letter_id, name, sort_order)
      SELECT ${letterId}::uuid, sec->>'name', (ord - 1)::int
      FROM jsonb_array_elements(${payload}::jsonb) WITH ORDINALITY AS t(sec, ord)
      RETURNING id, sort_order
    )
    INSERT INTO section_items (section_id, item, in_qty, used, out_qty, notes, sort_order)
    SELECT
      s.id,
      item->>'item',
      COALESCE(item->>'inQty', ''),
      COALESCE(item->>'used', ''),
      COALESCE(item->>'outQty', ''),
      COALESCE(item->>'notes', ''),
      (item_ord - 1)::int
    FROM jsonb_array_elements(${payload}::jsonb) WITH ORDINALITY AS t(sec, sec_ord)
    JOIN ins_sections s ON s.sort_order = (sec_ord - 1)::int
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(sec->'items', '[]'::jsonb)) WITH ORDINALITY AS i(item, item_ord)
  `
}

export async function listLetters(sql: Sql): Promise<Endorsement[]> {
  const rows = await sql`SELECT * FROM v_endorsement_letters ORDER BY "updatedAt" DESC`
  return rows.map((row) => mapLetter(row as Record<string, unknown>))
}

export async function getLetter(sql: Sql, id: string): Promise<Endorsement | undefined> {
  const rows = await sql`SELECT * FROM v_endorsement_letters WHERE id = ${id}::uuid`
  const row = rows[0]
  return row ? mapLetter(row as Record<string, unknown>) : undefined
}

export async function createLetter(sql: Sql, input: EndorsementInput): Promise<Endorsement> {
  const rows = await sql`
    INSERT INTO endorsement_letters (
      title, team, date, time,
      prepared_by_name, prepared_by_position,
      received_by_name, received_by_position
    ) VALUES (
      ${input.title}, ${input.team}, ${input.date}, ${input.time},
      ${input.preparedBy.name}, ${input.preparedBy.position},
      ${input.receivedBy.name}, ${input.receivedBy.position}
    )
    RETURNING id
  `
  const id = String(rows[0].id)
  await insertSections(sql, id, input.sections)
  const created = await getLetter(sql, id)
  if (!created) throw new Error('Failed to load created letter')
  return created
}

export async function updateLetter(
  sql: Sql,
  id: string,
  input: EndorsementInput,
): Promise<Endorsement | undefined> {
  const rows = await sql`
    UPDATE endorsement_letters SET
      title = ${input.title},
      team = ${input.team},
      date = ${input.date},
      time = ${input.time},
      prepared_by_name = ${input.preparedBy.name},
      prepared_by_position = ${input.preparedBy.position},
      received_by_name = ${input.receivedBy.name},
      received_by_position = ${input.receivedBy.position}
    WHERE id = ${id}::uuid
    RETURNING id
  `
  if (!rows[0]) return undefined
  await sql`DELETE FROM letter_sections WHERE letter_id = ${id}::uuid`
  await insertSections(sql, id, input.sections)
  return getLetter(sql, id)
}

export async function deleteLetter(sql: Sql, id: string): Promise<boolean> {
  const rows = await sql`
    DELETE FROM endorsement_letters WHERE id = ${id}::uuid RETURNING id
  `
  return rows.length > 0
}
