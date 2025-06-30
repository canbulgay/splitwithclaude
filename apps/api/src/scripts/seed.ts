import { PrismaClient, Role } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create test users
  const user1 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      name: 'John Doe',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    },
  })

  const user2 = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      email: 'jane@example.com',
      name: 'Jane Smith',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b589?w=150&h=150&fit=crop&crop=face',
    },
  })

  const user3 = await prisma.user.upsert({
    where: { email: 'mike@example.com' },
    update: {},
    create: {
      email: 'mike@example.com',
      name: 'Mike Johnson',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    },
  })

  console.log(`✅ Created users: ${user1.name}, ${user2.name}, ${user3.name}`)

  // Create a test group
  const group1 = await prisma.group.upsert({
    where: { id: 'demo-group-1' },
    update: {},
    create: {
      id: 'demo-group-1',
      name: 'Weekend Trip',
      description: 'Our amazing weekend getaway expenses',
      createdBy: user1.id,
    },
  })

  // Add members to the group
  await prisma.groupMember.upsert({
    where: {
      groupId_userId: {
        groupId: group1.id,
        userId: user1.id,
      },
    },
    update: {},
    create: {
      groupId: group1.id,
      userId: user1.id,
      role: Role.ADMIN,
    },
  })

  await prisma.groupMember.upsert({
    where: {
      groupId_userId: {
        groupId: group1.id,
        userId: user2.id,
      },
    },
    update: {},
    create: {
      groupId: group1.id,
      userId: user2.id,
      role: Role.MEMBER,
    },
  })

  await prisma.groupMember.upsert({
    where: {
      groupId_userId: {
        groupId: group1.id,
        userId: user3.id,
      },
    },
    update: {},
    create: {
      groupId: group1.id,
      userId: user3.id,
      role: Role.MEMBER,
    },
  })

  console.log(`✅ Created group: ${group1.name} with 3 members`)

  // Create test expenses
  const expense1 = await prisma.expense.upsert({
    where: { id: 'demo-expense-1' },
    update: {},
    create: {
      id: 'demo-expense-1',
      groupId: group1.id,
      amount: 120.00,
      description: 'Hotel booking',
      paidBy: user1.id,
    },
  })

  const expense2 = await prisma.expense.upsert({
    where: { id: 'demo-expense-2' },
    update: {},
    create: {
      id: 'demo-expense-2',
      groupId: group1.id,
      amount: 75.50,
      description: 'Dinner at restaurant',
      paidBy: user2.id,
    },
  })

  const expense3 = await prisma.expense.upsert({
    where: { id: 'demo-expense-3' },
    update: {},
    create: {
      id: 'demo-expense-3',
      groupId: group1.id,
      amount: 45.25,
      description: 'Gas and parking',
      paidBy: user3.id,
    },
  })

  console.log(`✅ Created expenses: $${expense1.amount}, $${expense2.amount}, $${expense3.amount}`)

  // Create expense splits (equal splits for all expenses)
  const users = [user1, user2, user3]
  const expenses = [expense1, expense2, expense3]

  for (const expense of expenses) {
    const splitAmount = Number(expense.amount) / users.length
    
    for (const user of users) {
      await prisma.expenseSplit.upsert({
        where: {
          expenseId_userId: {
            expenseId: expense.id,
            userId: user.id,
          },
        },
        update: {},
        create: {
          expenseId: expense.id,
          userId: user.id,
          amountOwed: Math.round(splitAmount * 100) / 100, // Round to 2 decimal places
        },
      })
    }
  }

  console.log('✅ Created expense splits for all expenses')

  // Create a sample settlement
  const settlement1 = await prisma.settlement.upsert({
    where: { id: 'demo-settlement-1' },
    update: {},
    create: {
      id: 'demo-settlement-1',
      fromUser: user2.id,
      toUser: user1.id,
      amount: 25.00,
    },
  })

  // Link settlement to an expense
  await prisma.settlementExpense.upsert({
    where: {
      settlementId_expenseId: {
        settlementId: settlement1.id,
        expenseId: expense1.id,
      },
    },
    update: {},
    create: {
      settlementId: settlement1.id,
      expenseId: expense1.id,
    },
  })

  console.log(`✅ Created settlement: $${settlement1.amount}`)

  console.log('🎉 Database seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })