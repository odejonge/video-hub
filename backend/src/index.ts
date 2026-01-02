import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import passport from 'passport'
import { configurePassport } from './config/passport.js'
import authRoutes from './routes/auth.js'
import clipRoutes from './routes/clips.js'
import collectionRoutes from './routes/collections.js'
import creditRoutes from './routes/credits.js'
import videoRoutes from './routes/videos.js'
import templateRoutes from './routes/templates.js'
import webhookRoutes from './routes/webhooks.js'

const app = express()
const PORT = process.env.PORT || 3000

// Webhooks need raw body
app.use('/webhooks', express.raw({ type: 'application/json' }), webhookRoutes)

// CORS - allow same origin (reverse proxy) and configured frontend
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost',
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean) as string[]

app.use(cors({ 
  origin: (origin, callback) => {
    // Allow requests with no origin (same origin, mobile apps, etc)
    if (!origin) return callback(null, true)
    
    // Allow configured origins
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      return callback(null, true)
    }
    
    // Allow ngrok URLs
    if (origin.includes('ngrok')) {
      return callback(null, true)
    }
    
    // Allow any localhost
    if (origin.includes('localhost')) {
      return callback(null, true)
    }
    
    callback(null, false)
  },
  credentials: true 
}))

app.use(express.json())
app.use(passport.initialize())

// Configure OAuth strategies
configurePassport()

// Routes
app.use('/auth', authRoutes)
app.use('/api/clips', clipRoutes)
app.use('/api/collections', collectionRoutes)
app.use('/api/credits', creditRoutes)
app.use('/api/videos', videoRoutes)
app.use('/api/templates', templateRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📍 Frontend URL: ${process.env.FRONTEND_URL || 'not set'}`)
  console.log(`📍 Backend URL: ${process.env.BACKEND_URL || 'not set'}`)
})
