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

// Copy collection (duplicate for current user)
router.post('/:id/copy', auth, async (req: AuthRequest, res) => {
  const sourceCollection = await prisma.collection.findFirst({
    where: {
      id: req.params.id,
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

// Share collection with another user
router.post('/:id/share', auth, async (req: AuthRequest, res) => {
  const { targetUserEmail } = req.body

  const sourceCollection = await prisma.collection.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
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
