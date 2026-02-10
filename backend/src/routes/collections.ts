import crypto from 'crypto'
import { Router } from 'express'
import { prisma } from '../config/db.js'
import { auth, AuthRequest } from '../middleware/auth.js'

const router = Router()

// Public: get shared collection by share token (no auth required)
router.get('/shared/:shareToken', async (req, res) => {
  const { shareToken } = req.params

  const collection = await prisma.collection.findUnique({
    where: { shareToken },
    include: {
      tags: {
        include: {
          _count: { select: { clips: true } },
        },
        orderBy: { name: 'asc' },
      },
      clips: {
        include: {
          video: {
            select: {
              id: true,
              videoUrl: true,
              thumbnailUrl: true,
            },
          },
          tags: { include: { tag: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!collection) {
    return res.status(404).json({ error: 'collection_not_found' })
  }

  // Return without user-specific data
  const { userId, ...publicData } = collection
  res.json(publicData)
})

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
  const id = req.params.id as string
  
  const collection = await prisma.collection.findFirst({
    where: {
      id,
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
  const id = req.params.id as string
  const { name, description, isPublic } = req.body

  const collection = await prisma.collection.updateMany({
    where: { id, userId: req.user!.id },
    data: { name, description, isPublic },
  })

  if (collection.count === 0) {
    return res.status(404).json({ error: 'collection_not_found' })
  }

  const updated = await prisma.collection.findUnique({
    where: { id },
    include: { tags: true },
  })
  res.json(updated)
})

// Delete collection
router.delete('/:id', auth, async (req: AuthRequest, res) => {
  const id = req.params.id as string
  
  const result = await prisma.collection.deleteMany({
    where: { id, userId: req.user!.id },
  })

  if (result.count === 0) {
    return res.status(404).json({ error: 'collection_not_found' })
  }

  res.status(204).send()
})

// Get tags for a collection
router.get('/:id/tags', auth, async (req: AuthRequest, res) => {
  const id = req.params.id as string
  
  const collection = await prisma.collection.findFirst({
    where: {
      id,
      OR: [{ userId: req.user!.id }, { isPublic: true }],
    },
  })

  if (!collection) {
    return res.status(404).json({ error: 'collection_not_found' })
  }

  const tags = await prisma.tag.findMany({
    where: { collectionId: id },
    include: {
      _count: { select: { clips: true } },
    },
    orderBy: { name: 'asc' },
  })

  res.json(tags)
})

// Create tag in collection (idempotent - returns existing if duplicate)
router.post('/:id/tags', auth, async (req: AuthRequest, res) => {
  const id = req.params.id as string
  const { name } = req.body

  const collection = await prisma.collection.findFirst({
    where: { id, userId: req.user!.id },
  })

  if (!collection) {
    return res.status(404).json({ error: 'collection_not_found' })
  }

  const normalizedName = name.trim().toLowerCase()

  // Return existing tag if it already exists (idempotent)
  const existing = await prisma.tag.findUnique({
    where: { collectionId_name: { collectionId: id, name: normalizedName } },
  })

  if (existing) {
    return res.json(existing)
  }

  const tag = await prisma.tag.create({
    data: {
      name: normalizedName,
      collectionId: id,
    },
  })

  res.status(201).json(tag)
})

// Batch create tags in collection
router.post('/:id/tags/batch', auth, async (req: AuthRequest, res) => {
  const id = req.params.id as string
  const { names } = req.body as { names: string[] }

  if (!Array.isArray(names) || names.length === 0) {
    return res.status(400).json({ error: 'names_required' })
  }

  const collection = await prisma.collection.findFirst({
    where: { id, userId: req.user!.id },
  })

  if (!collection) {
    return res.status(404).json({ error: 'collection_not_found' })
  }

  const normalizedNames = [...new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean))]

  // Find which tags already exist in this collection
  const existingTags = await prisma.tag.findMany({
    where: { collectionId: id, name: { in: normalizedNames } },
  })
  const existingNames = new Set(existingTags.map((t) => t.name))

  // Create only the new ones
  const newNames = normalizedNames.filter((n) => !existingNames.has(n))

  if (newNames.length > 0) {
    await prisma.tag.createMany({
      data: newNames.map((name) => ({ name, collectionId: id })),
    })
  }

  // Return all tags for this collection
  const allTags = await prisma.tag.findMany({
    where: { collectionId: id },
    include: { _count: { select: { clips: true } } },
    orderBy: { name: 'asc' },
  })

  res.status(201).json(allTags)
})

// Update tag
router.patch('/:collectionId/tags/:tagId', auth, async (req: AuthRequest, res) => {
  const collectionId = req.params.collectionId as string
  const tagId = req.params.tagId as string
  const { name } = req.body

  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, userId: req.user!.id },
  })

  if (!collection) {
    return res.status(404).json({ error: 'collection_not_found' })
  }

  const normalizedName = name.trim().toLowerCase()

  try {
    const tag = await prisma.tag.update({
      where: { id: tagId },
      data: { name: normalizedName },
    })
    res.json(tag)
  } catch {
    return res.status(409).json({ error: 'tag_name_conflict' })
  }
})

// Delete tag
router.delete('/:collectionId/tags/:tagId', auth, async (req: AuthRequest, res) => {
  const collectionId = req.params.collectionId as string
  const tagId = req.params.tagId as string
  
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, userId: req.user!.id },
  })

  if (!collection) {
    return res.status(404).json({ error: 'collection_not_found' })
  }

  await prisma.tag.delete({ where: { id: tagId } })

  res.status(204).send()
})

// Copy collection (duplicate for current user)
router.post('/:id/copy', auth, async (req: AuthRequest, res) => {
  const id = req.params.id as string
  
  const sourceCollection = await prisma.collection.findFirst({
    where: {
      id,
      OR: [{ userId: req.user!.id }, { isPublic: true }],
    },
    include: {
      tags: true,
      clips: {
        include: {
          video: true,
          tags: { include: { tag: true } },
        },
      },
    },
  })

  if (!sourceCollection) {
    return res.status(404).json({ error: 'collection_not_found' })
  }

  // Create new collection
  const newCollection = await prisma.collection.create({
    data: {
      name: `${sourceCollection.name} (kopie)`,
      description: sourceCollection.description,
      userId: req.user!.id,
    },
  })

  // Copy tags
  const tagMapping = new Map<string, string>()
  for (const tag of sourceCollection.tags) {
    const newTag = await prisma.tag.create({
      data: {
        name: tag.name,
        collectionId: newCollection.id,
      },
    })
    tagMapping.set(tag.id, newTag.id)
  }

  // Copy clips with their tags
  for (const clip of sourceCollection.clips) {
    // Ensure user has access to the video
    const videoAccess = await prisma.videoAccess.findFirst({
      where: { videoId: clip.video.id, userId: req.user!.id },
    })

    if (!videoAccess) {
      // Grant access to the video
      await prisma.videoAccess.create({
        data: {
          videoId: clip.video.id,
          userId: req.user!.id,
        },
      })
    }

    const newClip = await prisma.clip.create({
      data: {
        title: clip.title,
        startTime: clip.startTime,
        endTime: clip.endTime,
        videoId: clip.video.id,
        collectionId: newCollection.id,
      },
    })

    // Copy clip tags
    for (const clipTag of clip.tags) {
      const newTagId = tagMapping.get(clipTag.tag.id)
      if (newTagId) {
        await prisma.clipTag.create({
          data: {
            clipId: newClip.id,
            tagId: newTagId,
          },
        })
      }
    }
  }

  res.status(201).json({ id: newCollection.id, name: newCollection.name })
})

// Generate share link for collection
router.post('/:id/share-link', auth, async (req: AuthRequest, res) => {
  const id = req.params.id as string

  const collection = await prisma.collection.findFirst({
    where: { id, userId: req.user!.id },
  })

  if (!collection) {
    return res.status(404).json({ error: 'collection_not_found' })
  }

  // Reuse existing token or generate new one
  const shareToken = collection.shareToken || crypto.randomUUID()

  if (!collection.shareToken) {
    await prisma.collection.update({
      where: { id },
      data: { shareToken },
    })
  }

  res.json({ shareToken })
})

// Revoke share link
router.delete('/:id/share-link', auth, async (req: AuthRequest, res) => {
  const id = req.params.id as string

  const result = await prisma.collection.updateMany({
    where: { id, userId: req.user!.id },
    data: { shareToken: null },
  })

  if (result.count === 0) {
    return res.status(404).json({ error: 'collection_not_found' })
  }

  res.status(204).send()
})

// Share collection with another user
router.post('/:id/share', auth, async (req: AuthRequest, res) => {
  const id = req.params.id as string
  const { targetUserEmail } = req.body

  const sourceCollection = await prisma.collection.findFirst({
    where: { id, userId: req.user!.id },
    include: {
      tags: true,
      clips: {
        include: {
          video: true,
          tags: { include: { tag: true } },
        },
      },
    },
  })

  if (!sourceCollection) {
    return res.status(404).json({ error: 'collection_not_found' })
  }

  const targetUser = await prisma.user.findUnique({
    where: { email: targetUserEmail },
  })

  if (!targetUser) {
    return res.status(404).json({ error: 'user_not_found' })
  }

  if (targetUser.id === req.user!.id) {
    return res.status(400).json({ error: 'cannot_share_with_self' })
  }

  // Create collection for target user
  const newCollection = await prisma.collection.create({
    data: {
      name: `${sourceCollection.name} (gedeeld)`,
      description: sourceCollection.description,
      userId: targetUser.id,
    },
  })

  // Copy tags
  const tagMapping = new Map<string, string>()
  for (const tag of sourceCollection.tags) {
    const newTag = await prisma.tag.create({
      data: {
        name: tag.name,
        collectionId: newCollection.id,
      },
    })
    tagMapping.set(tag.id, newTag.id)
  }

  // Copy clips with their tags
  for (const clip of sourceCollection.clips) {
    // Grant video access to target user
    const existingAccess = await prisma.videoAccess.findFirst({
      where: { videoId: clip.video.id, userId: targetUser.id },
    })

    if (!existingAccess) {
      await prisma.videoAccess.create({
        data: {
          videoId: clip.video.id,
          userId: targetUser.id,
        },
      })
    }

    const newClip = await prisma.clip.create({
      data: {
        title: clip.title,
        startTime: clip.startTime,
        endTime: clip.endTime,
        videoId: clip.video.id,
        collectionId: newCollection.id,
      },
    })

    // Copy clip tags
    for (const clipTag of clip.tags) {
      const newTagId = tagMapping.get(clipTag.tag.id)
      if (newTagId) {
        await prisma.clipTag.create({
          data: {
            clipId: newClip.id,
            tagId: newTagId,
          },
        })
      }
    }
  }

  res.status(201).json({ id: newCollection.id, sharedWith: targetUser.email })
})

export default router
