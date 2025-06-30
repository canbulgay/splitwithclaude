import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️ Resetting database...')

  // Delete all data in reverse order to respect foreign key constraints
  await prisma.settlementExpense.deleteMany()
  await prisma.settlement.deleteMany()
  await prisma.expenseSplit.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.groupMember.deleteMany()
  await prisma.group.deleteMany()
  await prisma.user.deleteMany()

  console.log('✅ Database reset completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error during reset:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })