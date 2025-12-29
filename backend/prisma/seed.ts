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

  // Seed dance categories
  await prisma.danceMove.createMany({
    data: [
      { name: 'Basic Step', category: 'salsa', difficulty: 1 },
      { name: 'Cross Body Lead', category: 'salsa', difficulty: 2 },
      { name: 'Suzie Q', category: 'salsa', difficulty: 3 },
      { name: 'Basic Step', category: 'bachata', difficulty: 1 },
      { name: 'Side Step', category: 'bachata', difficulty: 1 },
      { name: 'Body Wave', category: 'bachata', difficulty: 3 },
    ],
    skipDuplicates: true,
  })

  // Seed common tags
  await prisma.tag.createMany({
    data: [
      { name: 'beginner' },
      { name: 'intermediate' },
      { name: 'advanced' },
      { name: 'footwork' },
      { name: 'turns' },
      { name: 'styling' },
      { name: 'partnerwork' },
      { name: 'solo' },
    ],
    skipDuplicates: true,
  })

  console.log('✅ Database seeded!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())


