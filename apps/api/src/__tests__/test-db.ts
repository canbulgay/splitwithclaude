import { PrismaClient } from '@prisma/client'

// Create a test-specific Prisma client with SQLite for testing
const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./test.db',
    },
  },
})

export default testPrisma