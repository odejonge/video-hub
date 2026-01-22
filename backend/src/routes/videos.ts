import { Router } from 'express'
import { prisma } from '../config/db.js'
import { auth, AuthRequest } from '../middleware/auth.js'

const router = Router()

const CREDITS_PER_MINUTE = 10

// Get all videos user has access to (owned + shared)
router.get('/', auth, async (req: AuthRequest, res) => {
  const videos = await prisma.video.findMany({
    where: {
      OR: [
        { ownerId: req.user!.id },
        { sharedWith: { some: { userId: req.user!.id } } },
      ],
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { clips: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  res.json(videos)
})

// Get single video with its clips (for a specific collection context)
router.get('/:id', auth, async (req: AuthRequest, res) => {
  const id = req.params.id as string
  const collectionId = typeof req.query.collectionId === 'string' ? req.query.collectionId : undefined

  const video = await prisma.video.findFirst({
    where: {
      id,
      OR: [
        { ownerId: req.user!.id },
        { sharedWith: { some: { userId: req.user!.id } } },
      ],
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      clips: collectionId
        ? {
          where: { collectionId },
          include: {
            tags: { include: { tag: true } },
          },
          orderBy: { startTime: 'asc' },
        }
        : {
          include: {
            tags: { include: { tag: true } },
          },
          orderBy: { startTime: 'asc' },
        },
    },
  })

  if (!video) {
    return res.status(404).json({ error: 'video_not_found' })
  }

  res.json(video)
})

// Upload a new source video
router.post('/upload-url', auth, async (req: AuthRequest, res) => {
  const { title, durationSeconds } = req.body

  // Calculate credits needed
  const creditsNeeded = Math.ceil((durationSeconds / 60) * CREDITS_PER_MINUTE)

  // Check balance
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })

  if (!user || user.credits < creditsNeeded) {
    return res.status(402).json({
      error: 'insufficient_credits',
      needed: creditsNeeded,
      have: user?.credits ?? 0,
    })
  }

  // Create video slot in Bunny
  let bunnyVideo: { guid: string }

  try {
    console.log('Creating Bunny video slot...', { libraryId: process.env.BUNNY_LIBRARY_ID })

    const bunnyResponse = await fetch(
      `https://video.bunnycdn.com/library/${process.env.BUNNY_LIBRARY_ID}/videos`,
      {
        method: 'POST',
        headers: {
          AccessKey: process.env.BUNNY_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      }
    )

    if (!bunnyResponse.ok) {
      const errorText = await bunnyResponse.text()
      console.error('Bunny API error:', bunnyResponse.status, errorText)
      return res.status(500).json({ error: 'failed_to_create_video_slot', details: errorText })
    }

    bunnyVideo = await bunnyResponse.json()
    console.log('Bunny video created:', bunnyVideo.guid)
  } catch (err) {
    console.error('Bunny fetch error:', err)
    return res.status(500).json({ error: 'bunny_connection_failed' })
  }

  // Deduct credits
  await prisma.$transaction([
    prisma.user.update({
      where: { id: req.user!.id },
      data: { credits: { decrement: creditsNeeded } },
    }),
    prisma.transaction.create({
      data: {
        userId: req.user!.id,
        amount: -creditsNeeded,
        type: 'upload',
        description: `Video upload: ${title}`,
        metadata: { bunnyVideoId: bunnyVideo.guid, durationSeconds },
      },
    }),
  ])

  res.json({
    uploadUrl: `https://video.bunnycdn.com/library/${process.env.BUNNY_LIBRARY_ID}/videos/${bunnyVideo.guid}`,
    bunnyVideoId: bunnyVideo.guid,
    creditsUsed: creditsNeeded,
    authHeader: process.env.BUNNY_API_KEY,
  })
})

// Confirm video upload complete
router.post('/confirm-upload', auth, async (req: AuthRequest, res) => {
  const { bunnyVideoId, title, duration } = req.body

  const libraryId = process.env.BUNNY_LIBRARY_ID
  const cdnHostname = process.env.BUNNY_CDN_HOSTNAME || `vz-${libraryId}.b-cdn.net`
  // Use HLS streaming for adaptive quality (works with all resolutions)
  const videoUrl = `https://${cdnHostname}/${bunnyVideoId}/playlist.m3u8`
  const thumbnailUrl = `https://${cdnHostname}/${bunnyVideoId}/thumbnail.jpg`

  const video = await prisma.video.create({
    data: {
      title,
      videoUrl,
      thumbnailUrl,
      bunnyVideoId,
      duration,
      ownerId: req.user!.id,
    },
  })

  res.status(201).json(video)
})

// Share video with another user
router.post('/:id/share', auth, async (req: AuthRequest, res) => {
  const id = req.params.id as string
  const { email } = req.body

  // Verify ownership
  const video = await prisma.video.findFirst({
    where: { id, ownerId: req.user!.id },
  })

  if (!video) {
    return res.status(404).json({ error: 'video_not_found' })
  }

  // Find target user
  const targetUser = await prisma.user.findUnique({ where: { email } })

  if (!targetUser) {
    return res.status(404).json({ error: 'user_not_found' })
  }

  if (targetUser.id === req.user!.id) {
    return res.status(400).json({ error: 'cannot_share_with_self' })
  }

  // Create or update access
  await prisma.videoAccess.upsert({
    where: {
      videoId_userId: { videoId: video.id, userId: targetUser.id },
    },
    update: {},
    create: {
      videoId: video.id,
      userId: targetUser.id,
    },
  })

  res.json({ success: true, sharedWith: targetUser.email })
})

// Remove video sharing
router.delete('/:id/share/:userId', auth, async (req: AuthRequest, res) => {
  const id = req.params.id as string
  const userId = req.params.userId as string

  // Verify ownership
  const video = await prisma.video.findFirst({
    where: { id, ownerId: req.user!.id },
  })

  if (!video) {
    return res.status(404).json({ error: 'video_not_found' })
  }

  await prisma.videoAccess.deleteMany({
    where: { videoId: video.id, userId },
  })

  res.status(204).send()
})

// Get users video is shared with
router.get('/:id/shared-with', auth, async (req: AuthRequest, res) => {
  const id = req.params.id as string

  const video = await prisma.video.findFirst({
    where: { id, ownerId: req.user!.id },
    include: {
      sharedWith: {
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } },
        },
      },
    },
  })

  if (!video) {
    return res.status(404).json({ error: 'video_not_found' })
  }

  const users = video.sharedWith.map((access) => access.user)
  res.json(users)
})

// Create a clip from a video into a collection
router.post('/:videoId/clips', auth, async (req: AuthRequest, res) => {
  const videoId = req.params.videoId as string
  const { title, startTime, endTime, collectionId, tagNames } = req.body

  // Verify video access
  const video = await prisma.video.findFirst({
    where: {
      id: videoId,
      OR: [
        { ownerId: req.user!.id },
        { sharedWith: { some: { userId: req.user!.id } } },
      ],
    },
  })

  if (!video) {
    return res.status(404).json({ error: 'video_not_found' })
  }

  // Verify collection ownership
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, userId: req.user!.id },
  })

  if (!collection) {
    return res.status(404).json({ error: 'collection_not_found' })
  }

  // Create or get tags within this collection (case-insensitive)
  const tagConnections: { tagId: string }[] = []
  if (tagNames?.length) {
    for (const name of tagNames) {
      const normalizedName = name.trim().toLowerCase()
      if (!normalizedName) continue

      const tag = await prisma.tag.upsert({
        where: {
          collectionId_name: { collectionId, name: normalizedName },
        },
        update: {},
        create: { name: normalizedName, collectionId },
      })
      tagConnections.push({ tagId: tag.id })
    }
  }

  const clip = await prisma.clip.create({
    data: {
      title,
      startTime: startTime ?? 0,
      endTime,
      videoId: video.id,
      collectionId,
      tags: tagConnections.length ? { create: tagConnections } : undefined,
    },
    include: {
      tags: { include: { tag: true } },
      video: true,
    },
  })

  res.status(201).json(clip)
})

// Delete video (only owner can delete)
router.delete('/:id', auth, async (req: AuthRequest, res) => {
  const id = req.params.id as string

  const video = await prisma.video.findFirst({
    where: { id, ownerId: req.user!.id },
  })

  if (!video) {
    return res.status(404).json({ error: 'video_not_found' })
  }

  // Delete from Bunny
  if (video.bunnyVideoId) {
    await fetch(
      `https://video.bunnycdn.com/library/${process.env.BUNNY_LIBRARY_ID}/videos/${video.bunnyVideoId}`,
      {
        method: 'DELETE',
        headers: { AccessKey: process.env.BUNNY_API_KEY! },
      }
    )
  }

  await prisma.video.delete({ where: { id } })

  res.status(204).send()
})

export default router
