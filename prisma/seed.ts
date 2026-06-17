import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CATEGORIES = [
  {
    slug: 'bba-core',
    title: 'BBA Core',
    shortIntro:
      'Foundation courses covering principles of management, economics, and business communication for undergraduate students.',
    order: 0,
  },
  {
    slug: 'mba-specialization',
    title: 'MBA Specialization',
    shortIntro:
      'Advanced postgraduate programs in strategy, leadership, and executive decision-making for working professionals.',
    order: 1,
  },
  {
    slug: 'finance-accounting',
    title: 'Finance & Accounting',
    shortIntro:
      'Corporate finance, financial analysis, cost accounting, and investment management for business careers.',
    order: 2,
  },
  {
    slug: 'marketing-sales',
    title: 'Marketing & Sales',
    shortIntro:
      'Digital marketing, brand management, consumer behavior, and sales strategy for modern markets.',
    order: 3,
  },
  {
    slug: 'human-resources',
    title: 'Human Resource Management',
    shortIntro:
      'Organizational behavior, talent acquisition, performance management, and labor relations.',
    order: 4,
  },
  {
    slug: 'entrepreneurship',
    title: 'Entrepreneurship & Innovation',
    shortIntro:
      'Startup ventures, business model design, innovation management, and entrepreneurial finance.',
    order: 5,
  },
] as const

async function main() {
  for (const row of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: row.slug },
      create: {
        slug: row.slug,
        title: row.title,
        shortIntro: row.shortIntro,
        order: row.order,
      },
      update: {
        title: row.title,
        shortIntro: row.shortIntro,
        order: row.order,
        deletedAt: null,
      },
    })
  }

  console.log(`Seeded ${CATEGORIES.length} BBA/MBA categories.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
