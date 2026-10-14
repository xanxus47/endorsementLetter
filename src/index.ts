import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import type { Context } from 'hono'
import { cors } from 'hono/cors'
import { loadLogos, pdfFilename, renderLetterPdf } from './letter-pdf'
import { renderNotFound, renderPreviewPage } from './pages'
import {
  DeleteResponseSchema,
  EndorsementInputSchema,
  EndorsementListSchema,
  EndorsementResponseSchema,
  ErrorSchema,
  IdParamSchema,
} from './schemas'
import {
  createLetter,
  deleteLetter,
  getLetter,
  getSql,
  listLetters,
  updateLetter,
  type Sql,
} from './db'

type AppEnv = {
  Bindings: {
    ASSETS?: Fetcher
    CORS_ORIGIN?: string
    ENDORSEMENT_DATABASE_URL?: string
  }
}

function sqlFrom(c: { env: AppEnv['Bindings'] }): Sql {
  const url = c.env.ENDORSEMENT_DATABASE_URL
  if (!url) {
    throw new Error('ENDORSEMENT_DATABASE_URL is not set. Add it to .dev.vars')
  }
  return getSql(url)
}

function dbError(c: Context<AppEnv>, error: unknown) {
  const message = error instanceof Error ? error.message : 'Database error'
  if (/invalid input syntax for type uuid/i.test(message)) {
    return c.json({ error: 'Letter not found' }, 404)
  }
  console.error(error)
  return c.json({ error: 'Database error' }, 500)
}

function parseAllowedOrigins(value?: string): string[] {
  if (!value || value.trim() === '' || value.trim() === '*') return ['*']
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

const app = new OpenAPIHono<AppEnv>({
  defaultHook: (result, c) => {
    if (!result.success) {
      return c.json({ error: 'Validation failed', issues: result.error.issues }, 400)
    }
  },
})

app.use('*', async (c, next) => {
  const origins = parseAllowedOrigins(c.env.CORS_ORIGIN)
  const allowAll = origins.includes('*')

  return cors({
    origin: allowAll ? '*' : (requestOrigin) => (origins.includes(requestOrigin) ? requestOrigin : ''),
    allowMethods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposeHeaders: ['Content-Disposition', 'Content-Length'],
    maxAge: 86400,
    credentials: !allowAll,
  })(c, next)
})

const jsonError = {
  400: {
    description: 'Validation error',
    content: { 'application/json': { schema: ErrorSchema } },
  },
  404: {
    description: 'Letter not found',
    content: { 'application/json': { schema: ErrorSchema } },
  },
}

const listRoute = createRoute({
  method: 'get',
  path: '/api/endorsements',
  tags: ['Endorsements'],
  summary: 'List endorsement letters',
  responses: {
    200: {
      description: 'All stored letters',
      content: { 'application/json': { schema: EndorsementListSchema } },
    },
  },
})

const createRouteDef = createRoute({
  method: 'post',
  path: '/api/endorsements',
  tags: ['Endorsements'],
  summary: 'Create an endorsement letter',
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: EndorsementInputSchema } },
    },
  },
  responses: {
    201: {
      description: 'Created letter',
      content: { 'application/json': { schema: EndorsementResponseSchema } },
    },
    ...jsonError,
  },
})

const getRoute = createRoute({
  method: 'get',
  path: '/api/endorsements/{id}',
  tags: ['Endorsements'],
  summary: 'Get one endorsement letter',
  request: { params: IdParamSchema },
  responses: {
    200: {
      description: 'Letter',
      content: { 'application/json': { schema: EndorsementResponseSchema } },
    },
    ...jsonError,
  },
})

const updateRoute = createRoute({
  method: 'put',
  path: '/api/endorsements/{id}',
  tags: ['Endorsements'],
  summary: 'Replace an endorsement letter',
  request: {
    params: IdParamSchema,
    body: {
      required: true,
      content: { 'application/json': { schema: EndorsementInputSchema } },
    },
  },
  responses: {
    200: {
      description: 'Updated letter',
      content: { 'application/json': { schema: EndorsementResponseSchema } },
    },
    ...jsonError,
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/api/endorsements/{id}',
  tags: ['Endorsements'],
  summary: 'Delete an endorsement letter',
  request: { params: IdParamSchema },
  responses: {
    200: {
      description: 'Deleted',
      content: { 'application/json': { schema: DeleteResponseSchema } },
    },
    ...jsonError,
  },
})

const downloadRoute = createRoute({
  method: 'get',
  path: '/api/endorsements/{id}/download',
  tags: ['Endorsements'],
  summary: 'Download the letter as an A4 PDF',
  request: { params: IdParamSchema },
  responses: {
    200: {
      description: 'A4 PDF',
      content: {
        'application/pdf': {
          schema: z.string().openapi({ format: 'binary' }),
        },
      },
    },
    ...jsonError,
  },
})

app.openapi(listRoute, async (c) => {
  try {
    return c.json({ data: await listLetters(sqlFrom(c)) }, 200)
  } catch (error) {
    return dbError(c, error)
  }
})

app.openapi(createRouteDef, async (c) => {
  try {
    const created = await createLetter(sqlFrom(c), c.req.valid('json'))
    return c.json({ data: created }, 201)
  } catch (error) {
    return dbError(c, error)
  }
})

app.openapi(getRoute, async (c) => {
  try {
    const { id } = c.req.valid('param')
    const letter = await getLetter(sqlFrom(c), id)
    if (!letter) return c.json({ error: 'Letter not found' }, 404)
    return c.json({ data: letter }, 200)
  } catch (error) {
    return dbError(c, error)
  }
})

app.openapi(updateRoute, async (c) => {
  try {
    const { id } = c.req.valid('param')
    const updated = await updateLetter(sqlFrom(c), id, c.req.valid('json'))
    if (!updated) return c.json({ error: 'Letter not found' }, 404)
    return c.json({ data: updated }, 200)
  } catch (error) {
    return dbError(c, error)
  }
})

app.openapi(deleteRoute, async (c) => {
  try {
    const { id } = c.req.valid('param')
    if (!(await deleteLetter(sqlFrom(c), id))) return c.json({ error: 'Letter not found' }, 404)
    return c.json({ ok: true as const, id }, 200)
  } catch (error) {
    return dbError(c, error)
  }
})

app.openapi(downloadRoute, async (c) => {
  try {
    const { id } = c.req.valid('param')
    const letter = await getLetter(sqlFrom(c), id)
    if (!letter) return c.json({ error: 'Letter not found' }, 404)

    const logos = await loadLogos(c.env, new URL(c.req.url).origin)
    const pdf = await renderLetterPdf(letter, logos)
    return c.body(pdf, 200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${pdfFilename(letter)}"`,
    })
  } catch (error) {
    return dbError(c, error)
  }
})

app.get('/', (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(new Request(new URL('/app.html', c.req.url), c.req.raw))
  }
  return c.redirect('/app.html')
})

app.get('/letters/new', (c) => c.redirect('/app.html'))

app.get('/letters/:id/edit', (c) => {
  const id = encodeURIComponent(c.req.param('id'))
  return c.redirect(`/app.html?edit=${id}`)
})

app.get('/letters/:id', async (c) => {
  try {
    const letter = await getLetter(sqlFrom(c), c.req.param('id'))
    if (!letter) return c.html(renderNotFound(), 404)
    return c.html(renderPreviewPage(letter))
  } catch {
    return c.html(renderNotFound(), 404)
  }
})

app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    title: 'MDRRMO Endorsement Letter API',
    version: '1.0.0',
    description:
      'CRUD and A4 PDF download for Municipal Disaster Risk Reduction endorsement letters.',
  },
})

app.get('/docs', swaggerUI({ url: '/doc' }))

export default app
