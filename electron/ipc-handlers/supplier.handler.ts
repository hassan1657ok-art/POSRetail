import { ipcMain } from 'electron'
import prisma from '../database/index'
import { getCurrentUser } from './auth.handler'

export function registerSupplierHandlers() {
  ipcMain.handle('suppliers:getAll', async () => {
    return prisma.supplier.findMany({
      where: { isDeleted: false },
      orderBy: { name: 'asc' },
    })
  })

  ipcMain.handle('suppliers:create', async (_e, data: {
    name: string; contactPerson?: string; phone?: string; email?: string; address?: string; notes?: string
  }) => {
    await logActivity('create', 'Supplier')
    return prisma.supplier.create({ data })
  })

  ipcMain.handle('suppliers:update', async (_e, id: string, data: {
    name?: string; contactPerson?: string; phone?: string; email?: string; address?: string; notes?: string; isActive?: boolean
  }) => {
    await logActivity('update', 'Supplier', id)
    return prisma.supplier.update({ where: { id }, data })
  })

  ipcMain.handle('suppliers:delete', async (_e, id: string) => {
    await logActivity('delete', 'Supplier', id)
    return prisma.supplier.update({ where: { id }, data: { isDeleted: true } })
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
