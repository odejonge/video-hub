import { Router } from 'express'
import { prisma } from '../config/db.js'
import { auth, AuthRequest } from '../middleware/auth.js'

const router = Router()

// Get all collections for current user
router.get('/', auth, async (req: AuthRequest, res) => {
  const collections = await prisma.collection.findMany({
    where: { userId: req.user!.id },
    include: {
      _count: { select: { clips: true, videos: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  res.json(collections)
})

// Get single collection with clips
router.get('/:id', auth, async (req: AuthRequest, res) => {
  const collection = await prisma.collection.findFirst({
    where: {
      id: req.params.id,
      OR: [{ userId: req.user!.id }, { isPublic: true }],
    },
    include: {
      clips: {
        include: {
          danceMove: true,
          tags: { include: { tag: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!collection) {
    return res.status(404).json({ error: 'collection_not_found' })
  }

  res.json(collection)
})

// Create collection
router.post('/', auth, async (req: AuthRequest, res) => {
  const { name, description, isPublic } = req.body

  const collection = await prisma.collection.create({
    data: {
      name,
      description,
      isPublic: isPublic ?? false,
      userId: req.user!.id,
    },
  })

  res.status(201).json(collection)
})

// Update collection
router.patch('/:id', auth, async (req: AuthRequest, res) => {
  const { name, description, isPublic } = req.body

  const collection = await prisma.collection.updateMany({
    where: { id: req.params.id, userId: req.user!.id },
    data: { name, description, isPublic },
  })

  if (collection.count === 0) {
    return res.status(404).json({ error: 'collection_not_found' })
  }

  const updated = await prisma.collection.findUnique({ where: { id: req.params.id } })
  res.json(updated)
})

// Delete collection
router.delete('/:id', auth, async (req: AuthRequest, res) => {
  const result = await prisma.collection.deleteMany({
    where: { id: req.params.id, userId: req.user!.id },
  })

  if (result.count === 0) {
    return res.status(404).json({ error: 'collection_not_found' })
  }

  res.status(204).send()
})

export default router


