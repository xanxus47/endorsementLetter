import { z } from '@hono/zod-openapi'

export const ItemSchema = z
  .object({
    item: z.string().trim().min(1).openapi({ example: 'BVM (Adult)' }),
    inQty: z.string().trim().default('').openapi({ example: '1' }),
    used: z.string().trim().default('').openapi({ example: '' }),
    outQty: z.string().trim().default('').openapi({ example: '1' }),
    notes: z.string().trim().default('').openapi({ example: '' }),
  })
  .openapi('InventoryItem')

export const SectionSchema = z
  .object({
    name: z.string().trim().min(1).openapi({ example: 'Ambulance' }),
    items: z.array(ItemSchema).min(1),
  })
  .openapi('InventorySection')

export const TEAM_POSITIONS = [
  'Team Alpha - Team Leader',
  'Team Bravo - Team Leader',
  'Team Charlie - Team Leader',
  'Team Delta - Team Leader',
] as const

export const TeamPositionSchema = z.enum(TEAM_POSITIONS).openapi({
  example: 'Team Alpha - Team Leader',
})

export const SignatorySchema = z
  .object({
    name: z.string().trim().min(1).openapi({ example: 'Reginald Christian V. Balaygan' }),
    position: TeamPositionSchema,
  })
  .openapi('Signatory')

export const EndorsementInputSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1)
      .openapi({ example: 'Endorsement of Rescue Equipment and Medical Supplies' }),
    team: z.string().trim().min(1).openapi({ example: 'Team Charlie' }),
    date: z.string().trim().min(1).openapi({ example: 'October 05, 2026' }),
    time: z.string().trim().min(1).openapi({ example: '8:00 am – 8:00 pm' }),
    sections: z.array(SectionSchema).min(1),
    preparedBy: SignatorySchema,
    receivedBy: SignatorySchema,
  })
  .openapi('EndorsementInput')

export const EndorsementSchema = EndorsementInputSchema.extend({
  id: z.string().openapi({ example: 'sample' }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).openapi('Endorsement')

export const EndorsementListSchema = z
  .object({
    data: z.array(EndorsementSchema),
  })
  .openapi('EndorsementList')

export const EndorsementResponseSchema = z
  .object({
    data: EndorsementSchema,
  })
  .openapi('EndorsementResponse')

export const DeleteResponseSchema = z
  .object({
    ok: z.literal(true),
    id: z.string(),
  })
  .openapi('DeleteResponse')

export const ErrorSchema = z
  .object({
    error: z.string().openapi({ example: 'Validation failed' }),
    issues: z.array(z.unknown()).optional(),
  })
  .openapi('Error')

export const IdParamSchema = z.object({
  id: z.string().min(1).openapi({
    param: { name: 'id', in: 'path' },
    example: 'sample',
  }),
})

export type Item = z.infer<typeof ItemSchema>
export type Section = z.infer<typeof SectionSchema>
export type Signatory = z.infer<typeof SignatorySchema>
export type EndorsementInput = z.infer<typeof EndorsementInputSchema>
export type Endorsement = z.infer<typeof EndorsementSchema>
