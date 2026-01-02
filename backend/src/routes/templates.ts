import { Router } from 'express'
import { prisma } from '../config/db.js'

const router = Router()

// Get all templates
router.get('/', async (req, res) => {
  const templates = await prisma.template.findMany({
    include: {
      tags: {
        select: { name: true },
        orderBy: { name: 'asc' },
      },
      _count: { select: { tags: true } },
    },
    orderBy: { name: 'asc' },
  })

  res.json(templates)
})

// Get single template with tags
router.get('/:id', async (req, res) => {
  const template = await prisma.template.findUnique({
    where: { id: req.params.id },
    include: {
      tags: {
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      },
    },
  })

  if (!template) {
    return res.status(404).json({ error: 'template_not_found' })
  }

  res.json(template)
})

export default router

