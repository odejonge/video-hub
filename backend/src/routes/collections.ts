import { Router } from 'express'
import { prisma } from '../config/db.js'
import { auth, AuthRequest } from '../middleware/auth.js'

const router = Router()

// Get all collections for current user
router.get('/', auth, async (req: AuthRequest, res) => {
  const collections = await prisma.collection.findMany({
    where: { userId: req.user!.id },
    include: {
      _count: { select: { clips: true, tags: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  res.json(collections)
})

// Get single collection with clips and tags
router.get('/:id', auth, async (req: AuthRequest, res) => {
  const collection = await prisma.collection.findFirst({
    where: {
      id: req.params.id,
      OR: [{ userId: req.user!.id }, { isPublic: true }],
    },
    include: {
      tags: {
        include: {
          _count: { select: { clips: true } },
        },
        orderBy: { name: 'asc' },
      },
      clips: {
        include: {
          video: true,
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

// Create collection (optionally from template)
router.post('/', auth, async (req: AuthRequest, res) => {
  const { name, description, isPublic, templateId } = req.body

  // Create collection
  const collection = await prisma.collection.create({
    data: {
      name,
      description,
      isPublic: isPublic ?? false,
      userId: req.user!.id,
    },
  })

  // If template specified, copy its tags to the collection
  if (templateId) {
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      include: { tags: true },
    })

    if (template && template.tags.length > 0) {
      await prisma.tag.createMany({
        data: template.tags.map((t) => ({
          name: t.name.toLowerCase(),
          collectionId: collection.id,
        })),
      })
    }
  }

  // Return collection with tags
  const result = await prisma.collection.findUnique({
    where: { id: collection.id },
    include: {
      tags: true,
      _count: { select: { clips: true, tags: true } },
    },
  })

  res.status(201).json(result)
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

  const updated = await prisma.collection.findUnique({
    where: { id: req.params.id },
    include: { tags: true },
  })
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

// Get tags for a collection
router.get('/:id/tags', auth, async (req: AuthRequest, res) => {
  const collection = await prisma.collection.findFirst({
    where: {
      id: req.params.id,
      OR: [{ userId: req.user!.id }, { isPublic: true }],
    },
  })

  if (!collection) {
    return res.status(404).json({ error: 'collection_not_found' })
  }

  const tags = await prisma.tag.findMany({
    where: { collectionId: req.params.id },
    include: {
      _count: { select: { clips: true } },
    },
    orderBy: { name: 'asc' },
  })

  res.json(tags)
})

// Create tag in collection
router.post('/:id/tags', auth, async (req: AuthRequest, res) => {
  const { name } = req.body

  const collection = await prisma.collection.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  })

  if (!collection) {
    return res.status(404).json({ error: 'collection_not_found' })
  }

  const normalizedName = name.trim().toLowerCase()

  // Check if tag already exists
  const existing = await prisma.tag.findUnique({
    where: { collectionId_name: { collectionId: req.params.id, name: normalizedName } },
  })

  if (existing) {
    return res.status(409).json({ error: 'tag_already_exists', tag: existing })
  }

  const tag = await prisma.tag.create({
    data: {
      name: normalizedName,
      collectionId: req.params.id,
    },
  })

  res.status(201).json(tag)
})

// Update tag
router.patch('/:collectionId/tags/:tagId', auth, async (req: AuthRequest, res) => {
  const { name } = req.body

  const collection = await prisma.collection.findFirst({
    where: { id: req.params.collectionId, userId: req.user!.id },
  })

  if (!collection) {
    return res.status(404).json({ error: 'collection_not_found' })
  }

  const normalizedName = name.trim().toLowerCase()

  try {
    const tag = await prisma.tag.update({
      where: { id: req.params.tagId },
      data: { name: normalizedName },
    })
    res.json(tag)
  } catch {
    return res.status(409).json({ error: 'tag_name_conflict' })
  }
})

// Delete tag
router.delete('/:collectionId/tags/:tagId', auth, async (req: AuthRequest, res) => {
  const collection = await prisma.collection.findFirst({
    where: { id: req.params.collectionId, userId: req.user!.id },
  })

  if (!collection) {
    return res.status(404).json({ error: 'collection_not_found' })
  }

  await prisma.tag.delete({ where: { id: req.params.tagId } })

  res.status(204).send()
})

export default router
