import { ipcMain } from 'electron'
import prisma from '../database/index'
import { getCurrentUser } from './auth.handler'

export function registerBrandHandlers() {
  ipcMain.handle('brands:getAll', async () => {
    return prisma.brand.findMany({
      where: { isDeleted: false },
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    })
  })

  ipcMain.handle('brands:create', async (_e, data: { name: string }) => {
    await logActivity('create', 'Brand')
    return prisma.brand.create({ data })
  })

  ipcMain.handle('brands:update', async (_e, id: string, data: { name?: string; isActive?: boolean }) => {
    await logActivity('update', 'Brand', id)
    return prisma.brand.update({ where: { id }, data })
  })

  ipcMain.handle('brands:delete', async (_e, id: string) => {
    await logActivity('delete', 'Brand', id)
    return prisma.brand.update({ where: { id }, data: { isDeleted: true } })
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
