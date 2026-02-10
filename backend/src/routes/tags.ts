import { Router } from 'express'
import { prisma } from '../config/db.js'
import { auth, AuthRequest } from '../middleware/auth.js'

const router = Router()

// Get unique tag name suggestions from all user's collections
router.get('/suggestions', auth, async (req: AuthRequest, res) => {
  const tags = await prisma.tag.findMany({
    where: {
      collection: { userId: req.user!.id },
    },
    select: { name: true },
    distinct: ['name'],
    orderBy: { name: 'asc' },
  })

  res.json(tags.map((t) => t.name))
})

export default router
