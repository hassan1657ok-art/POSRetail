import { ipcMain } from 'electron'
import prisma from '../database/index'
import { getCurrentUser } from './auth.handler'

export function registerCustomerHandlers() {
  ipcMain.handle('customers:getAll', async () => {
    return prisma.customer.findMany({
      where: { isDeleted: false },
      orderBy: { updatedAt: 'desc' },
    })
  })

  ipcMain.handle('customers:create', async (_e, data: {
    fullName: string; phone?: string; email?: string; address?: string; city?: string; notes?: string
  }) => {
    await logActivity('create', 'Customer')
    return prisma.customer.create({ data })
  })

  ipcMain.handle('customers:update', async (_e, id: string, data: {
    fullName?: string; phone?: string; email?: string; address?: string; city?: string; notes?: string
  }) => {
    await logActivity('update', 'Customer', id)
    return prisma.customer.update({ where: { id }, data })
  })

  ipcMain.handle('customers:delete', async (_e, id: string) => {
    await logActivity('delete', 'Customer', id)
    return prisma.customer.update({ where: { id }, data: { isDeleted: true } })
  })

  ipcMain.handle('customers:search', async (_e, query: string) => {
    return prisma.customer.findMany({
      where: {
        isDeleted: false,
        OR: [
          { fullName: { contains: query } },
          { phone: { contains: query } },
          { email: { contains: query } },
        ],
      },
      take: 20,
    })
  })
}

async function logActivity(action: string, entity: string, entityId?: string) {
  const user = getCurrentUser()
  if (user) {
    await prisma.activityLog.create({
      data: { userId: user.id, action, entity, entityId },
    })
  }
}
