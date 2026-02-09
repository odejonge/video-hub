import { Router } from 'express'
import passport from 'passport'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/db.js'
import { auth, AuthRequest } from '../middleware/auth.js'
import type { User } from '@prisma/client'

const router = Router()

function generateToken(user: User): string {
  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' })
}

function redirectWithToken(res: any, user: User) {
  const token = generateToken(user)
  res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`)
}

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }))

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/failed' }),
  (req, res) => {
    redirectWithToken(res, req.user as User)
  }
)

// Facebook OAuth
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }))

router.get(
  '/facebook/callback',
  passport.authenticate('facebook', { session: false, failureRedirect: '/auth/failed' }),
  (req, res) => {
    redirectWithToken(res, req.user as User)
  }
)

// Dev login - only available in development (bypasses OAuth)
if (process.env.NODE_ENV === 'development') {
  router.get('/dev-login', async (req, res) => {
    try {
      let user = await prisma.user.findFirst({
        where: { email: 'dev@danceclips.nl' },
      })

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: 'dev@danceclips.nl',
            name: 'Dev User',
            provider: 'dev',
            providerId: 'dev-1',
            credits: 999,
          },
        })
      }

      redirectWithToken(res, user)
    } catch (error) {
      console.error('Dev login error:', error)
      res.redirect(`${process.env.FRONTEND_URL}/auth/failed`)
    }
  })
}

// Auth failed
router.get('/failed', (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/auth/failed`)
})

// Get current user
router.get('/me', auth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      credits: true,
      createdAt: true,
    },
  })

  if (!user) {
    return res.status(404).json({ error: 'user_not_found' })
  }

  res.json(user)
})

// Logout (just for completeness, JWT is stateless)
router.post('/logout', (req, res) => {
  res.json({ success: true })
})

export default router


