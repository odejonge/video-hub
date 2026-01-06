import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Seed credit packages
  await prisma.creditPackage.createMany({
    data: [
      { name: 'Starter', credits: 100, priceEur: 499 },
      { name: 'Basic', credits: 500, priceEur: 1999 },
      { name: 'Pro', credits: 2000, priceEur: 4999 },
    ],
    skipDuplicates: true,
  })

  // Seed templates with their tags
  const templates = [
    {
      name: 'Tango',
      description: 'Argentijnse tango bewegingen en figuren',
      tags: [
        'ocho adelante', 'ocho atras', 'basispas', 'boleo', 'sacada', 
        'barrida', 'volcada', 'gancho', 'parada', 'sandwich', 
        'colgada', 'americana', 'molinete', 'lapiz', 'enrosque'
      ],
    },
    {
      name: 'Salsa',
      description: 'Salsa on1 en on2 bewegingen',
      tags: [
        'basic step', 'cross body lead', 'suzie q', 'right turn',
        'left turn', 'inside turn', 'outside turn', 'copa',
        'enchufla', 'dile que no', 'setenta', 'sombrero',
        'cubanito', 'vacilala', 'exhibela'
      ],
    },
    {
      name: 'Bachata',
      description: 'Bachata sensual en dominicana',
      tags: [
        'basic step', 'side step', 'body wave', 'head roll',
        'hip roll', 'sensual wave', 'dominican footwork',
        'turn pattern', 'dip', 'shadow position', 'hammerlock',
        'wrap', 'cuddle', 'lean'
      ],
    },
    {
      name: 'Freerunning',
      description: 'Parkour en freerunning bewegingen',
      tags: [
        'precision jump', 'cat leap', 'kong vault', 'dash vault',
        'speed vault', 'lazy vault', 'palm spin', 'wall run',
        'front flip', 'back flip', 'side flip', 'webster',
        'gainer', 'wall spin', 'bar spin', 'muscle up'
      ],
    },
    {
      name: 'Voetbal Skills',
      description: 'Dribbel technieken en trucs',
      tags: [
        'step over', 'elastico', 'roulette', 'rabona',
        'rainbow flick', 'heel chop', 'la croqueta', 'cruyff turn',
        'maradona turn', 'ronaldo chop', 'nutmeg', 'pull back',
        'body feint', 'scissor kick', 'bicycle kick'
      ],
    },
    {
      name: 'Breakdance',
      description: 'Breaking power moves en toprock',
      tags: [
        'toprock', 'indian step', 'crossover', 'kick out',
        'six step', 'three step', 'coffee grinder', 'backspin',
        'headspin', 'windmill', 'flare', 'airflare',
        'freeze', 'baby freeze', 'chair freeze', 'air chair'
      ],
    },
  ]

  for (const template of templates) {
    // Create or update template
    const created = await prisma.template.upsert({
      where: { name: template.name },
      update: { description: template.description },
      create: { name: template.name, description: template.description },
    })

    // Delete existing tags for this template
    await prisma.templateTag.deleteMany({
      where: { templateId: created.id },
    })

    // Create tags
    await prisma.templateTag.createMany({
      data: template.tags.map((name) => ({
        name: name.toLowerCase(),
        templateId: created.id,
      })),
    })
  }

  console.log('✅ Database seeded!')
  console.log(`   - ${templates.length} templates with tags`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
