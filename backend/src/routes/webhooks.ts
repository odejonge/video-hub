import { Router } from 'express'
import express from 'express'
import { createMollieClient } from '@mollie/api-client'
import { prisma } from '../config/db.js'

const router = Router()

function getMollie() {
  if (!process.env.MOLLIE_API_KEY) {
    throw new Error('MOLLIE_API_KEY not configured')
  }
  return createMollieClient({ apiKey: process.env.MOLLIE_API_KEY })
}

// Mollie webhook - uses urlencoded body
router.post('/mollie', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    console.log('Mollie webhook received:', req.body)
    
    // Mollie sends payment ID in body as 'id'
    const paymentId = req.body.id
    
    if (!paymentId) {
      console.log('No payment ID in webhook')
      return res.status(400).send()
    }

    console.log('Fetching payment:', paymentId)
    const payment = await getMollie().payments.get(paymentId)
    console.log('Payment status:', payment.status)

    if (payment.status === 'paid') {
      const metadata = payment.metadata as {
        userId: string
        packageId: string
        credits: number
      }

      console.log('Payment metadata:', metadata)

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
        console.log('Processing payment, adding credits:', metadata.credits)
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
        console.log('Credits added successfully!')
      } else {
        console.log('Payment already processed')
      }
    }

    res.status(200).send()
  } catch (error) {
    console.error('Mollie webhook error:', error)
    res.status(500).send()
  }
})

export default router
