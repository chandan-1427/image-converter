import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { FRONTEND_ORIGIN } from './config/env.js'
import { jobsRoutes } from './routes/jobs.routes.js'
import { progressRoutes } from './routes/progress.routes.js'
import { filesRoutes } from './routes/files.routes.js'

export const app = new Hono()

// CORS: only allow our actual frontend origin, with credentials off.
app.use(
  '/*',
  cors({
    origin: FRONTEND_ORIGIN,
    allowMethods: ['GET', 'POST'],
  })
)

app.route('/api/jobs', jobsRoutes)
app.route('/api/jobs', progressRoutes)
app.route('/api/files', filesRoutes)