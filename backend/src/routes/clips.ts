import { Router } from 'express'
import { prisma } from '../config/db.js'
import { auth, AuthRequest } from '../middleware/auth.js'

const router = Router()

// Get single clip
router.get('/:id', auth, async (req: AuthRequest, res) => {
  const clip = await prisma.clip.findFirst({
    where: { id: req.params.id },
    include: {
      collection: true,
      video: true,
      tags: { include: { tag: true } },
    },
  })

  if (!clip) {
    return res.status(404).json({ error: 'clip_not_found' })
  }

  // Check access: own collection or public collection
  if (clip.collection.userId !== req.user!.id && !clip.collection.isPublic) {
    return res.status(404).json({ error: 'clip_not_found' })
  }

  res.json(clip)
})

// Update clip
router.patch('/:id', auth, async (req: AuthRequest, res) => {
  const { title, startTime, endTime, tagNames } = req.body

  // Verify ownership through collection
  const clip = await prisma.clip.findFirst({
    where: { id: req.params.id },
    include: { collection: true },
  })

  if (!clip || clip.collection.userId !== req.user!.id) {
    return res.status(404).json({ error: 'clip_not_found' })
  }

  // Update basic fields
  const updated = await prisma.clip.update({
    where: { id: req.params.id },
    data: { title, startTime, endTime },
  })

  // Update tags if provided
  if (tagNames !== undefined) {
    // Remove existing tags
    await prisma.clipTag.deleteMany({ where: { clipId: clip.id } })

    // Add new tags
    if (tagNames?.length) {
      for (const name of tagNames) {
        const normalizedName = name.trim().toLowerCase()
        if (!normalizedName) continue

        const tag = await prisma.tag.upsert({
          where: {
            collectionId_name: { collectionId: clip.collectionId, name: normalizedName },
          },
          update: {},
          create: { name: normalizedName, collectionId: clip.collectionId },
        })

        await prisma.clipTag.create({
          data: { clipId: clip.id, tagId: tag.id },
        })
      }
    }
  }

  // Return updated clip with tags
  const result = await prisma.clip.findUnique({
    where: { id: req.params.id },
    include: {
      video: true,
      tags: { include: { tag: true } },
    },
  })

  res.json(result)
})

// Delete clip
router.delete('/:id', auth, async (req: AuthRequest, res) => {
  const clip = await prisma.clip.findFirst({
    where: { id: req.params.id },
    include: { collection: true },
  })

  if (!clip || clip.collection.userId !== req.user!.id) {
    return res.status(404).json({ error: 'clip_not_found' })
  }

  await prisma.clip.delete({ where: { id: req.params.id } })

  res.status(204).send()
})

// Copy clip to another collection (same user)
router.post('/:id/copy', auth, async (req: AuthRequest, res) => {
  const { targetCollectionId } = req.body

  // Get source clip
  const clip = await prisma.clip.findFirst({
    where: { id: req.params.id },
    include: {
      collection: true,
      tags: { include: { tag: true } },
    },
  })

  if (!clip || clip.collection.userId !== req.user!.id) {
    return res.status(404).json({ error: 'clip_not_found' })
  }

  // Verify target collection ownership
  const targetCollection = await prisma.collection.findFirst({
    where: { id: targetCollectionId, userId: req.user!.id },
  })

  if (!targetCollection) {
    return res.status(404).json({ error: 'target_collection_not_found' })
  }

  // Create new clip in target collection
  const newClip = await prisma.clip.create({
    data: {
      title: clip.title,
      startTime: clip.startTime,
      endTime: clip.endTime,
      videoId: clip.videoId,
      collectionId: targetCollectionId,
    },
  })

  // Copy tags with upsert
  for (const clipTag of clip.tags) {
    const tag = await prisma.tag.upsert({
      where: {
        collectionId_name: { collectionId: targetCollectionId, name: clipTag.tag.name },
      },
      update: {},
      create: { name: clipTag.tag.name, collectionId: targetCollectionId },
    })

    await prisma.clipTag.create({
      data: { clipId: newClip.id, tagId: tag.id },
    })
  }

  // Return new clip with tags
  const result = await prisma.clip.findUnique({
    where: { id: newClip.id },
    include: {
      video: true,
      tags: { include: { tag: true } },
    },
  })

  res.status(201).json(result)
})

// Move clip to another collection (same user)
router.post('/:id/move', auth, async (req: AuthRequest, res) => {
  const { targetCollectionId } = req.body

  // Get source clip
  const clip = await prisma.clip.findFirst({
    where: { id: req.params.id },
    include: {
      collection: true,
      tags: { include: { tag: true } },
    },
  })

  if (!clip || clip.collection.userId !== req.user!.id) {
    return res.status(404).json({ error: 'clip_not_found' })
  }

  // Verify target collection ownership
  const targetCollection = await prisma.collection.findFirst({
    where: { id: targetCollectionId, userId: req.user!.id },
  })

  if (!targetCollection) {
    return res.status(404).json({ error: 'target_collection_not_found' })
  }

  // Delete old clip tags
  await prisma.clipTag.deleteMany({ where: { clipId: clip.id } })

  // Update clip's collection
  await prisma.clip.update({
    where: { id: clip.id },
    data: { collectionId: targetCollectionId },
  })

  // Recreate tags in target collection
  for (const clipTag of clip.tags) {
    const tag = await prisma.tag.upsert({
      where: {
        collectionId_name: { collectionId: targetCollectionId, name: clipTag.tag.name },
      },
      update: {},
      create: { name: clipTag.tag.name, collectionId: targetCollectionId },
    })

    await prisma.clipTag.create({
      data: { clipId: clip.id, tagId: tag.id },
    })
  }

  // Return updated clip
  const result = await prisma.clip.findUnique({
    where: { id: clip.id },
    include: {
      video: true,
      tags: { include: { tag: true } },
    },
  })

  res.json(result)
})

// Share clip with another user (copy to their Inbox collection)
router.post('/:id/share', auth, async (req: AuthRequest, res) => {
  const { targetUserEmail } = req.body

  // Get source clip
  const clip = await prisma.clip.findFirst({
    where: { id: req.params.id },
    include: {
      collection: true,
      video: true,
      tags: { include: { tag: true } },
    },
  })

  if (!clip || clip.collection.userId !== req.user!.id) {
    return res.status(404).json({ error: 'clip_not_found' })
  }

  // Find target user
  const targetUser = await prisma.user.findUnique({ where: { email: targetUserEmail } })

  if (!targetUser) {
    return res.status(404).json({ error: 'user_not_found' })
  }

  // Find or create user's Inbox collection
  let targetCollection = await prisma.collection.findFirst({
    where: { userId: targetUser.id, name: 'Inbox' },
  })

  if (!targetCollection) {
    targetCollection = await prisma.collection.create({
      data: {
        name: 'Inbox',
        description: 'Ontvangen clips van andere gebruikers',
        userId: targetUser.id,
      },
    })
  }

  const targetCollectionId = targetCollection.id

  // Share the underlying video with target user (if not already shared)
  await prisma.videoAccess.upsert({
    where: {
      videoId_userId: { videoId: clip.videoId, userId: targetUser.id },
    },
    update: {},
    create: {
      videoId: clip.videoId,
      userId: targetUser.id,
    },
  })

  // Create copy of clip in target collection
  const newClip = await prisma.clip.create({
    data: {
      title: clip.title,
      startTime: clip.startTime,
      endTime: clip.endTime,
      videoId: clip.videoId,
      collectionId: targetCollectionId,
    },
  })

  // Copy tags with upsert to target collection
  for (const clipTag of clip.tags) {
    const tag = await prisma.tag.upsert({
      where: {
        collectionId_name: { collectionId: targetCollectionId, name: clipTag.tag.name },
      },
      update: {},
      create: { name: clipTag.tag.name, collectionId: targetCollectionId },
    })

    await prisma.clipTag.create({
      data: { clipId: newClip.id, tagId: tag.id },
    })
  }

  res.status(201).json({
    success: true,
    sharedWith: targetUser.email,
    clipId: newClip.id,
  })
})

// Search clips across user's collections
router.get('/', auth, async (req: AuthRequest, res) => {
  const { q, tag, collectionId } = req.query

  const clips = await prisma.clip.findMany({
    where: {
      collection: { userId: req.user!.id },
      ...(collectionId && { collectionId: collectionId as string }),
      ...(q && { title: { contains: q as string, mode: 'insensitive' } }),
      ...(tag && { tags: { some: { tag: { name: { equals: (tag as string).toLowerCase() } } } } }),
    },
    include: {
      video: true,
      tags: { include: { tag: true } },
      collection: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  res.json(clips)
})

export default router
