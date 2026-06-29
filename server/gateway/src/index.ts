import { serve } from '@hono/node-server'
import { app } from './app.js'
import { PORT } from './config/env.js'

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Gateway server running at http://localhost:${info.port}`)
})