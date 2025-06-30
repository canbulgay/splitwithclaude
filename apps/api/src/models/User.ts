import { User as PrismaUser, Prisma } from '@prisma/client'
import prisma from '../lib/db'

export class UserModel {
  /**
   * Create a new user
   */
  static async create(data: Prisma.UserCreateInput): Promise<PrismaUser> {
    return prisma.user.create({
      data,
    })
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<PrismaUser | null> {
    return prisma.user.findUnique({
      where: { id },
    })
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<PrismaUser | null> {
    return prisma.user.findUnique({
      where: { email },
    })
  }

  /**
   * Update user
   */
  static async update(id: string, data: Prisma.UserUpdateInput): Promise<PrismaUser> {
    return prisma.user.update({
      where: { id },
      data,
    })
  }

  /**
   * Delete user
   */
  static async delete(id: string): Promise<PrismaUser> {
    return prisma.user.delete({
      where: { id },
    })
  }

  /**
   * Get all users
   */
  static async findMany(options?: {
    skip?: number
    take?: number
    orderBy?: Prisma.UserOrderByWithRelationInput
  }): Promise<PrismaUser[]> {
    return prisma.user.findMany({
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || { createdAt: 'desc' },
    })
  }

  /**
   * Get user with groups
   */
  static async findWithGroups(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        groupMembers: {
          include: {
            group: true,
          },
        },
        createdGroups: true,
      },
    })
  }

  /**
   * Get user with expense splits
   */
  static async findWithExpenses(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        expensesPaid: {
          include: {
            group: true,
            splits: true,
          },
        },
        expenseSplits: {
          include: {
            expense: {
              include: {
                group: true,
                payer: true,
              },
            },
          },
        },
      },
    })
  }
}