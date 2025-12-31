import { Router } from 'express'
import { prisma } from '../config/db.js'
import { auth, AuthRequest } from '../middleware/auth.js'

const router = Router()

// Get all tags with clip counts for current user
router.get('/', auth, async (req: AuthRequest, res) => {
  // Get all tags (including empty ones)
  const tags = await prisma.tag.findMany({
    include: {
      _count: {
        select: {
          clips: {
            where: {
              clip: {
                collection: { userId: req.user!.id }
              }
            }
          }
        }
      }
    },
    orderBy: { name: 'asc' }
  })

  res.json(tags)
})

// Get clips by tag
router.get('/:tagName/clips', auth, async (req: AuthRequest, res) => {
  const tagName = req.params.tagName.toLowerCase()

  const clips = await prisma.clip.findMany({
    where: {
      collection: { userId: req.user!.id },
      tags: {
        some: {
          tag: { name: tagName }
        }
      }
    },
    include: {
      video: true,
      danceMove: true,
      tags: { include: { tag: true } },
      collection: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  res.json(clips)
})

// Create or get tag (case-insensitive)
router.post('/', auth, async (req: AuthRequest, res) => {
  const name = req.body.name?.trim().toLowerCase()

  if (!name) {
    return res.status(400).json({ error: 'name_required' })
  }

  const tag = await prisma.tag.upsert({
    where: { name },
    update: {},
    create: { name }
  })

  res.json(tag)
})

// Update tag name
router.patch('/:id', auth, async (req: AuthRequest, res) => {
  const newName = req.body.name?.trim().toLowerCase()

  if (!newName) {
    return res.status(400).json({ error: 'name_required' })
  }

  // Check if new name already exists
  const existing = await prisma.tag.findUnique({ where: { name: newName } })
  if (existing && existing.id !== req.params.id) {
    return res.status(409).json({ error: 'tag_already_exists' })
  }

  const tag = await prisma.tag.update({
    where: { id: req.params.id },
    data: { name: newName }
  })

  res.json(tag)
})

// Delete tag
router.delete('/:id', auth, async (req: AuthRequest, res) => {
  await prisma.tag.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

// Add tag to clip
router.post('/clip/:clipId', auth, async (req: AuthRequest, res) => {
  const tagName = req.body.name?.trim().toLowerCase()

  if (!tagName) {
    return res.status(400).json({ error: 'name_required' })
  }

  // Verify clip ownership
  const clip = await prisma.clip.findFirst({
    where: { id: req.params.clipId },
    include: { collection: true }
  })

  if (!clip || clip.collection.userId !== req.user!.id) {
    return res.status(404).json({ error: 'clip_not_found' })
  }

  // Create or get tag
  const tag = await prisma.tag.upsert({
    where: { name: tagName },
    update: {},
    create: { name: tagName }
  })

  // Link tag to clip (ignore if already exists)
  await prisma.clipTag.upsert({
    where: { clipId_tagId: { clipId: clip.id, tagId: tag.id } },
    update: {},
    create: { clipId: clip.id, tagId: tag.id }
  })

  res.json(tag)
})

// Remove tag from clip
router.delete('/clip/:clipId/:tagId', auth, async (req: AuthRequest, res) => {
  // Verify clip ownership
  const clip = await prisma.clip.findFirst({
    where: { id: req.params.clipId },
    include: { collection: true }
  })

  if (!clip || clip.collection.userId !== req.user!.id) {
    return res.status(404).json({ error: 'clip_not_found' })
  }

  await prisma.clipTag.delete({
    where: { clipId_tagId: { clipId: req.params.clipId, tagId: req.params.tagId } }
  })

  res.status(204).send()
})

export default router

