import { Router } from 'express'
import { prisma } from '../config/db.js'
import { auth, AuthRequest } from '../middleware/auth.js'

const router = Router()

const CREDITS_PER_MINUTE = 10

// Get upload URL (Bunny)
router.post('/upload-url', auth, async (req: AuthRequest, res) => {
  const { title, durationSeconds, collectionId } = req.body

  // Verify collection ownership
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, userId: req.user!.id },
  })

  if (!collection) {
    return res.status(404).json({ error: 'collection_not_found' })
  }

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

// Confirm upload complete
router.post('/confirm-upload', auth, async (req: AuthRequest, res) => {
  const { bunnyVideoId, title, collectionId, startTime, endTime, danceMoveId, tags } = req.body

  // Verify collection ownership
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, userId: req.user!.id },
  })

  if (!collection) {
    return res.status(404).json({ error: 'collection_not_found' })
  }

  // Bunny Stream URL format
  const libraryId = process.env.BUNNY_LIBRARY_ID
  const cdnHostname = process.env.BUNNY_CDN_HOSTNAME || `vz-${libraryId}.b-cdn.net`
  const videoUrl = `https://${cdnHostname}/${bunnyVideoId}/play_720p.mp4`
  const thumbnailUrl = `https://${cdnHostname}/${bunnyVideoId}/thumbnail.jpg`

  const clip = await prisma.clip.create({
    data: {
      title,
      videoUrl,
      thumbnailUrl,
      bunnyVideoId,
      collectionId,
      startTime,
      endTime,
      danceMoveId,
      tags: tags?.length
        ? {
            create: tags.map((tagId: string) => ({ tagId })),
          }
        : undefined,
    },
    include: {
      danceMove: true,
      tags: { include: { tag: true } },
    },
  })

  res.status(201).json(clip)
})

// Get single clip
router.get('/:id', auth, async (req: AuthRequest, res) => {
  const clip = await prisma.clip.findFirst({
    where: { id: req.params.id },
    include: {
      collection: true,
      video: true,
      danceMove: true,
      tags: { include: { tag: true } },
    },
  })

  if (!clip || clip.collection.userId !== req.user!.id) {
    return res.status(404).json({ error: 'clip_not_found' })
  }

  res.json(clip)
})

// Update clip (timestamps, title, etc)
router.patch('/:id', auth, async (req: AuthRequest, res) => {
  const { title, startTime, endTime, danceMoveId } = req.body

  // Verify ownership through collection
  const clip = await prisma.clip.findFirst({
    where: { id: req.params.id },
    include: { collection: true },
  })

  if (!clip || clip.collection.userId !== req.user!.id) {
    return res.status(404).json({ error: 'clip_not_found' })
  }

  const updated = await prisma.clip.update({
    where: { id: req.params.id },
    data: { title, startTime, endTime, danceMoveId },
    include: {
      danceMove: true,
      tags: { include: { tag: true } },
    },
  })

  res.json(updated)
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

  // Delete from Bunny
  if (clip.bunnyVideoId) {
    await fetch(
      `https://video.bunnycdn.com/library/${process.env.BUNNY_LIBRARY_ID}/videos/${clip.bunnyVideoId}`,
      {
        method: 'DELETE',
        headers: { AccessKey: process.env.BUNNY_API_KEY! },
      }
    )
  }

  await prisma.clip.delete({ where: { id: req.params.id } })

  res.status(204).send()
})

// Search clips
router.get('/search', auth, async (req: AuthRequest, res) => {
  const { q, danceMove, tag } = req.query

  const clips = await prisma.clip.findMany({
    where: {
      collection: { userId: req.user!.id },
      ...(q && { title: { contains: q as string, mode: 'insensitive' } }),
      ...(danceMove && { danceMove: { name: danceMove as string } }),
      ...(tag && { tags: { some: { tag: { name: tag as string } } } }),
    },
    include: {
      danceMove: true,
      tags: { include: { tag: true } },
      collection: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  res.json(clips)
})

export default router

