import { Router } from 'express'
import { createMollieClient } from '@mollie/api-client'
import { prisma } from '../config/db.js'
import { auth, AuthRequest } from '../middleware/auth.js'

const router = Router()

function getMollie() {
  if (!process.env.MOLLIE_API_KEY) {
    throw new Error('MOLLIE_API_KEY not configured')
  }
  return createMollieClient({ apiKey: process.env.MOLLIE_API_KEY })
}

// Get credit packages
router.get('/packages', async (req, res) => {
  const packages = await prisma.creditPackage.findMany({
    where: { active: true },
    orderBy: { priceEur: 'asc' },
  })

  res.json(packages)
})

// Get user's credit balance and transaction history
router.get('/balance', auth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { credits: true },
  })

  const transactions = await prisma.transaction.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  res.json({
    credits: user?.credits ?? 0,
    transactions,
  })
})

// Purchase credits
router.post('/purchase', auth, async (req: AuthRequest, res) => {
  try {
    const { packageId, returnOrigin } = req.body

    const pkg = await prisma.creditPackage.findUnique({
      where: { id: packageId, active: true },
    })

    if (!pkg) {
      return res.status(404).json({ error: 'package_not_found' })
    }

    // Use the origin the user came from, or fallback to FRONTEND_URL
    const redirectBase = returnOrigin || process.env.FRONTEND_URL
    const webhookBase = process.env.BACKEND_URL

    const payment = await getMollie().payments.create({
      amount: {
        currency: 'EUR',
        value: (pkg.priceEur / 100).toFixed(2),
      },
      description: `${pkg.credits} credits - DanceClips`,
      redirectUrl: `${redirectBase}/credits/success`,
      webhookUrl: `${webhookBase}/webhooks/mollie`,
      metadata: {
        userId: req.user!.id,
        packageId: pkg.id,
        credits: pkg.credits,
      },
    })

    res.json({ checkoutUrl: payment.getCheckoutUrl() })
  } catch (err: any) {
    console.error('Mollie purchase error:', err.message)
    res.status(500).json({ error: 'payment_failed', message: err.message })
  }
})

export default router

