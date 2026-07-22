import { ipcMain } from 'electron'
import prisma from '../database/index'

export function registerActivityHandlers() {
  ipcMain.handle('activity:getLogs', async () => {
    return prisma.activityLog.findMany({
      where: { isDeleted: false },
      include: { user: { select: { fullName: true, username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
  })

  ipcMain.handle('notifications:getAll', async () => {
    return prisma.notification.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  })

  ipcMain.handle('notifications:markRead', async (_e, id: string) => {
    return prisma.notification.update({ where: { id }, data: { isRead: true } })
  })
}
