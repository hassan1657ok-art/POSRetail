import { ipcMain } from 'electron'
import prisma from '../database/index'
import { getCurrentUser } from './auth.handler'

export function registerCategoryHandlers() {
  ipcMain.handle('categories:getAll', async () => {
    return prisma.category.findMany({
      where: { isDeleted: false },
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    })
  })

  ipcMain.handle('categories:create', async (_e, data: { name: string; slug: string; parentId?: string }) => {
    await logActivity('create', 'Category')
    return prisma.category.create({ data })
  })

  ipcMain.handle('categories:update', async (_e, id: string, data: { name?: string; slug?: string; isActive?: boolean }) => {
    await logActivity('update', 'Category', id)
    return prisma.category.update({ where: { id }, data })
  })

  ipcMain.handle('categories:delete', async (_e, id: string) => {
    const productCount = await prisma.product.count({ where: { categoryId: id, isDeleted: false } })
    if (productCount > 0) throw new Error('Cannot delete category with existing products')
    await logActivity('delete', 'Category', id)
    return prisma.category.update({ where: { id }, data: { isDeleted: true } })
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
