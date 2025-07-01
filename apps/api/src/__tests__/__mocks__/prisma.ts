// Mock Prisma client for testing

// Create a simple mock database
const mockDatabase = {
  users: new Map(),
  groups: new Map(),
  groupMembers: new Map(),
  expenses: new Map(),
  expenseSplits: new Map(),
  settlements: new Map(),
  settlementExpenses: new Map(),
}

// Keep track of test data for easier lookup
const testData = {
  users: {} as Record<string, any>,
  groups: {} as Record<string, any>,
  groupMembers: {} as Record<string, any>,
}

// Mock user data - will be populated during tests
const mockUsers: Record<string, any> = {}

// Mock Prisma client
const prismaMock: any = {
  user: {
    create: jest.fn(({ data }) => {
      const id = `user-${Date.now()}-${Math.random()}`
      const user = { id, ...data, createdAt: new Date(), updatedAt: new Date() }
      mockUsers[id] = user
      testData.users[id] = user
      mockDatabase.users.set(id, user)
      return Promise.resolve(user)
    }),
    findUnique: jest.fn(({ where }) => {
      if (where.email) {
        const user = Object.values(mockUsers).find((u: any) => u.email === where.email)
        return Promise.resolve(user || null)
      }
      if (where.id) {
        return Promise.resolve(mockUsers[where.id] || null)
      }
      return Promise.resolve(null)
    }),
    findMany: jest.fn(() => Promise.resolve(Object.values(mockUsers))),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(() => Promise.resolve({ count: 0 })),
  },
  group: {
    create: jest.fn(({ data }) => {
      const id = `group-${Date.now()}-${Math.random()}`
      const group = { id, ...data, createdAt: new Date(), updatedAt: new Date() }
      testData.groups[id] = group
      mockDatabase.groups.set(id, group)
      return Promise.resolve(group)
    }),
    findMany: jest.fn(({ where, include }) => {
      if (where?.members?.some) {
        // Find groups where user is a member
        const userId = where.members.some.userId
        const userGroups = Object.values(testData.groups).filter((group: any) => {
          const memberKey = `${group.id}-${userId}`
          return testData.groupMembers[memberKey]
        })
        
        if (include?.members) {
          // Include member data
          return Promise.resolve(userGroups.map((group: any) => ({
            ...group,
            members: Object.values(testData.groupMembers).filter((m: any) => m.groupId === group.id)
          })))
        }
        
        return Promise.resolve(userGroups)
      }
      return Promise.resolve(Object.values(testData.groups))
    }),
    findUnique: jest.fn(({ where, include }) => {
      if (where.id) {
        const group = testData.groups[where.id]
        if (!group) return Promise.resolve(null)
        
        let result: any = { ...group }
        
        if (include?.members) {
          const members = Object.values(testData.groupMembers).filter((m: any) => m.groupId === group.id)
          const membersWithUsers = members.map((member: any) => ({
            ...member,
            user: testData.users[member.userId] || { id: member.userId, name: 'Test User', email: `user${member.userId}@test.com` }
          }))
          
          result.members = membersWithUsers
          result.creator = testData.users[group.createdBy] || { id: group.createdBy, name: 'Creator', email: 'creator@test.com' }
        }
        
        if (include?.expenses) {
          // Return empty expenses array for now (no expenses in test data)
          result.expenses = []
        }
        
        return Promise.resolve(result)
      }
      return Promise.resolve(null)
    }),
    update: jest.fn(({ where, data }) => {
      if (where.id) {
        const group = testData.groups[where.id]
        if (group) {
          const updated = { ...group, ...data, updatedAt: new Date() }
          testData.groups[where.id] = updated
          return Promise.resolve(updated)
        }
      }
      return Promise.resolve(null)
    }),
    delete: jest.fn(({ where }) => {
      if (where.id) {
        const group = testData.groups[where.id]
        if (group) {
          delete testData.groups[where.id]
          return Promise.resolve(group)
        }
      }
      return Promise.resolve(null)
    }),
    deleteMany: jest.fn(() => {
      const count = Object.keys(testData.groups).length
      testData.groups = {}
      return Promise.resolve({ count })
    }),
  },
  groupMember: {
    create: jest.fn(({ data }) => {
      const member = { ...data, joinedAt: new Date() }
      const key = `${data.groupId}-${data.userId}`
      testData.groupMembers[key] = member
      mockDatabase.groupMembers.set(key, member)
      return Promise.resolve(member)
    }),
    findMany: jest.fn(({ where }) => {
      if (where?.groupId) {
        const members = Object.values(testData.groupMembers).filter((m: any) => m.groupId === where.groupId)
        return Promise.resolve(members)
      }
      return Promise.resolve([])
    }),
    findUnique: jest.fn(({ where }) => {
      if (where.groupId_userId) {
        const key = `${where.groupId_userId.groupId}-${where.groupId_userId.userId}`
        const member = testData.groupMembers[key]
        return Promise.resolve(member || null)
      }
      return Promise.resolve(null)
    }),
    update: jest.fn(({ where, data }) => {
      if (where.groupId_userId) {
        const key = `${where.groupId_userId.groupId}-${where.groupId_userId.userId}`
        const member = testData.groupMembers[key]
        if (member) {
          const updated = { ...member, ...data }
          testData.groupMembers[key] = updated
          return Promise.resolve(updated)
        }
      }
      return Promise.resolve(null)
    }),
    delete: jest.fn(({ where }) => {
      if (where.groupId_userId) {
        const key = `${where.groupId_userId.groupId}-${where.groupId_userId.userId}`
        const member = testData.groupMembers[key]
        if (member) {
          delete testData.groupMembers[key]
          return Promise.resolve(member)
        }
      }
      return Promise.resolve(null)
    }),
    deleteMany: jest.fn(() => Promise.resolve({ count: 0 })),
  },
  expense: {
    create: jest.fn(),
    findMany: jest.fn(() => Promise.resolve([])),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(() => Promise.resolve({ count: 0 })),
  },
  expenseSplit: {
    create: jest.fn(),
    findMany: jest.fn(() => Promise.resolve([])),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(() => Promise.resolve({ count: 0 })),
  },
  settlement: {
    create: jest.fn(),
    findMany: jest.fn(() => Promise.resolve([])),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(() => Promise.resolve({ count: 0 })),
  },
  settlementExpense: {
    create: jest.fn(),
    findMany: jest.fn(() => Promise.resolve([])),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(() => Promise.resolve({ count: 0 })),
  },
  $disconnect: jest.fn(() => Promise.resolve()),
  $transaction: jest.fn(async (operations: any) => {
    if (Array.isArray(operations)) {
      return await Promise.all(operations)
    }
    // Handle transaction callback - simulate GroupModel.createWithAdmin
    const transactionContext = {
      ...prismaMock,
      group: {
        ...prismaMock.group,
        create: jest.fn(({ data }) => {
          const id = `group-${Date.now()}-${Math.random()}`
          const group = { 
            id, 
            name: data.name,
            description: data.description,
            createdBy: data.creator?.connect?.id || data.createdBy,
            createdAt: new Date(), 
            updatedAt: new Date() 
          }
          testData.groups[id] = group
          return Promise.resolve(group)
        })
      }
    }
    return await operations(transactionContext)
  }),
}

// Function to reset test data between tests
export const resetTestData = () => {
  testData.users = {}
  testData.groups = {}
  testData.groupMembers = {}
  mockDatabase.users.clear()
  mockDatabase.groups.clear()
  mockDatabase.groupMembers.clear()
  mockDatabase.expenses.clear()
  mockDatabase.expenseSplits.clear()
  mockDatabase.settlements.clear()
  mockDatabase.settlementExpenses.clear()
  
  // Reset mock counters
  Object.values(mockUsers).forEach(user => delete mockUsers[user.id])
}

export { testData }
export default prismaMock