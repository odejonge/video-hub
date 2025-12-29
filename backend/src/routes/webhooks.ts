import { Router } from 'express'
import { createMollieClient } from '@mollie/api-client'
import { prisma } from '../config/db.js'

const router = Router()

function getMollie() {
  if (!process.env.MOLLIE_API_KEY) {
    throw new Error('MOLLIE_API_KEY not configured')
  }
  return createMollieClient({ apiKey: process.env.MOLLIE_API_KEY })
}

// Mollie webhook
router.post('/mollie', async (req, res) => {
  try {
    const body = JSON.parse(req.body.toString())
    const paymentId = body.id

    if (!paymentId) {
      return res.status(400).send()
    }

    const payment = await getMollie().payments.get(paymentId)

    if (payment.status === 'paid') {
      const metadata = payment.metadata as {
        userId: string
        packageId: string
        credits: number
      }

      // Check if already processed
      const existing = await prisma.transaction.findFirst({
        where: {
          metadata: {
            path: ['mollieId'],
            equals: paymentId,
          },
        },
      })

      if (!existing) {
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
              metadata: { mollieId: paymentId, packageId: metadata.packageId },
            },
          }),
        ])
      }
    }

    res.status(200).send()
  } catch (error) {
    console.error('Mollie webhook error:', error)
    res.status(500).send()
  }
})

export default router

