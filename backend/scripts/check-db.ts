import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 1. Check duplicate packages
  const packages = await prisma.creditPackage.findMany()
  console.log('Credit packages:', packages.length)
  packages.forEach(p => console.log(`  - ${p.name}: ${p.credits} credits, €${p.priceEur/100}`))

  // 2. Delete duplicates, keep only one of each
  const seen = new Set<string>()
  for (const pkg of packages) {
    if (seen.has(pkg.name)) {
      await prisma.creditPackage.delete({ where: { id: pkg.id } })
      console.log(`Deleted duplicate: ${pkg.name}`)
    } else {
      seen.add(pkg.name)
    }
  }

  // 3. Check recent transactions
  const transactions = await prisma.transaction.findMany({ 
    take: 5, 
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { email: true } } }
  })
  console.log('\nRecent transactions:', transactions.length)
  transactions.forEach(t => console.log(`  - ${t.type}: ${t.amount} credits (${t.user?.email})`))

  // 4. Check users
  const users = await prisma.user.findMany({ select: { id: true, email: true, credits: true } })
  console.log('\nUsers:')
  users.forEach(u => console.log(`  - ${u.email}: ${u.credits} credits`))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())


