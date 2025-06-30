import { Group as PrismaGroup, Prisma, Role } from '@prisma/client'
import prisma from '../lib/db'

export class GroupModel {
  /**
   * Create a new group
   */
  static async create(data: Prisma.GroupCreateInput): Promise<PrismaGroup> {
    return prisma.group.create({
      data,
    })
  }

  /**
   * Create a group with initial admin member
   */
  static async createWithAdmin(
    groupData: Omit<Prisma.GroupCreateInput, 'creator'>,
    creatorId: string
  ) {
    return prisma.$transaction(async (tx) => {
      // Create the group
      const group = await tx.group.create({
        data: {
          ...groupData,
          creator: {
            connect: { id: creatorId },
          },
        },
      })

      // Add creator as admin member
      await tx.groupMember.create({
        data: {
          groupId: group.id,
          userId: creatorId,
          role: Role.ADMIN,
        },
      })

      return group
    })
  }

  /**
   * Find group by ID
   */
  static async findById(id: string): Promise<PrismaGroup | null> {
    return prisma.group.findUnique({
      where: { id },
    })
  }

  /**
   * Find group with members
   */
  static async findWithMembers(id: string) {
    return prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        creator: true,
      },
    })
  }

  /**
   * Find group with expenses
   */
  static async findWithExpenses(id: string) {
    return prisma.group.findUnique({
      where: { id },
      include: {
        expenses: {
          include: {
            payer: true,
            splits: {
              include: {
                user: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        members: {
          include: {
            user: true,
          },
        },
      },
    })
  }

  /**
   * Update group
   */
  static async update(id: string, data: Prisma.GroupUpdateInput): Promise<PrismaGroup> {
    return prisma.group.update({
      where: { id },
      data,
    })
  }

  /**
   * Delete group
   */
  static async delete(id: string): Promise<PrismaGroup> {
    return prisma.group.delete({
      where: { id },
    })
  }

  /**
   * Add member to group
   */
  static async addMember(groupId: string, userId: string, role: Role = Role.MEMBER) {
    return prisma.groupMember.create({
      data: {
        groupId,
        userId,
        role,
      },
    })
  }

  /**
   * Remove member from group
   */
  static async removeMember(groupId: string, userId: string) {
    return prisma.groupMember.delete({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    })
  }

  /**
   * Update member role
   */
  static async updateMemberRole(groupId: string, userId: string, role: Role) {
    return prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
      data: { role },
    })
  }

  /**
   * Check if user is member of group
   */
  static async isMember(groupId: string, userId: string): Promise<boolean> {
    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    })
    return !!member
  }

  /**
   * Check if user is admin of group
   */
  static async isAdmin(groupId: string, userId: string): Promise<boolean> {
    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    })
    return member?.role === Role.ADMIN
  }

  /**
   * Get groups for user
   */
  static async findByUserId(userId: string) {
    return prisma.group.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        creator: true,
        _count: {
          select: {
            expenses: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
  }
}