import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import passport from 'passport'
import { configurePassport } from './config/passport.js'
import authRoutes from './routes/auth.js'
import clipRoutes from './routes/clips.js'
import collectionRoutes from './routes/collections.js'
import creditRoutes from './routes/credits.js'
import danceMoveRoutes from './routes/dance-moves.js'
import videoRoutes from './routes/videos.js'
import webhookRoutes from './routes/webhooks.js'

const app = express()
const PORT = process.env.PORT || 3000

// Webhooks need raw body
app.use('/webhooks', express.raw({ type: 'application/json' }), webhookRoutes)

// Middleware
app.use(cors({ 
  origin: [
    process.env.FRONTEND_URL!,
    'http://192.168.1.172:5173', // Local network access
    /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // Any local IP
  ], 
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
app.use('/api/dance-moves', danceMoveRoutes)
app.use('/api/videos', videoRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`🌐 Network: http://192.168.1.172:${PORT}`)
})

