import { Router } from 'express'
import { prisma } from '../config/db.js'

const router = Router()

// Get all dance moves
router.get('/', async (req, res) => {
  const moves = await prisma.danceMove.findMany({
    orderBy: [{ category: 'asc' }, { difficulty: 'asc' }, { name: 'asc' }],
  })

  res.json(moves)
})

// Get dance moves by category
router.get('/category/:category', async (req, res) => {
  const moves = await prisma.danceMove.findMany({
    where: { category: req.params.category },
    orderBy: [{ difficulty: 'asc' }, { name: 'asc' }],
  })

  res.json(moves)
})

export default router


