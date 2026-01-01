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
      redirectUrl: `${redirectBase}/credits/result`,
      webhookUrl: `${webhookBase}/webhooks/mollie`,
      metadata: {
        userId: req.user!.id,
        packageId: pkg.id,
        credits: pkg.credits,
      },
    })

    // Return payment ID so frontend can store it
    res.json({ 
      checkoutUrl: payment.getCheckoutUrl(),
      paymentId: payment.id,
    })
  } catch (err: any) {
    console.error('Mollie purchase error:', err.message)
    res.status(500).json({ error: 'payment_failed', message: err.message })
  }
})

// Check payment status (also acts as fallback if webhook was missed)
router.get('/payment/:id', auth, async (req: AuthRequest, res) => {
  try {
    console.log('Checking payment status for:', req.params.id)
    const payment = await getMollie().payments.get(req.params.id)
    console.log('Payment status result:', payment.status)
    
    // Verify this payment belongs to the current user
    const metadata = payment.metadata as { userId: string; packageId: string; credits: number }
    if (metadata.userId !== req.user!.id) {
      console.log('Payment user mismatch:', metadata.userId, '!=', req.user!.id)
      return res.status(403).json({ error: 'forbidden' })
    }
    
    // Fallback: if paid but not yet processed, add credits now
    if (payment.status === 'paid') {
      const existing = await prisma.transaction.findFirst({
        where: {
          metadata: {
            path: ['mollieId'],
            equals: payment.id,
          },
        },
      })
      
      if (!existing) {
        console.log('Fallback: processing missed payment, adding credits:', metadata.credits)
        await prisma.$transaction([
          prisma.user.update({
            where: { id: metadata.userId },
            data: { credits: { increment: metadata.credits } },
          }),
          prisma.transaction.create({
            data: {
              userId: metadata.userId,
              amount: metadata.credits,
              type: 'purchase',
              description: `Aankoop ${metadata.credits} credits`,
              metadata: { mollieId: payment.id, packageId: metadata.packageId },
            },
          }),
        ])
      }
    }
    
    res.json({
      status: payment.status,
      amount: payment.amount,
      description: payment.description,
    })
  } catch (err: any) {
    console.error('Payment check error:', err.message)
    res.status(500).json({ error: 'payment_check_failed', message: err.message })
  }
})

export default router

