import { Hono } from 'hono'
import path from 'node:path'
import fs from 'node:fs/promises'
import { getStorageDir } from '../services/storage.service.js'

export const filesRoutes = new Hono()

filesRoutes.get('/:fileName', async (c) => {
  const fileName = c.req.param('fileName')

  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return c.json({ error: 'Invalid file name' }, 400)
  }

  const filePath = path.join(getStorageDir(), fileName)

  try {
    const file = await fs.readFile(filePath)
    return new Response(file, {
      headers: {
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch {
    return c.json({ error: 'File not found or expired' }, 404)
  }
})