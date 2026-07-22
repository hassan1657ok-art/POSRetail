import { ipcMain, dialog } from 'electron'
import prisma from '../database/index'
import { getCurrentUser } from './auth.handler'
import fs from 'fs'
import path from 'path'

export function registerSettingsHandlers() {
  ipcMain.handle('settings:getBusiness', async () => {
    return prisma.business.findFirst({ where: { isDeleted: false } })
  })

  ipcMain.handle('settings:updateBusiness', async (_e, data: {
    name?: string; address?: string; phone?: string; email?: string; currency?: string; taxRate?: number; taxName?: string; receiptFooter?: string
  }) => {
    const biz = await prisma.business.findFirst({ where: { isDeleted: false } })
    if (!biz) throw new Error('Business not found')
    await logActivity('update', 'Business', biz.id)
    return prisma.business.update({ where: { id: biz.id }, data })
  })

  ipcMain.handle('settings:exportDB', async () => {
    const result = await dialog.showSaveDialog({
      title: 'Export Database',
      defaultPath: 'pos-backup.db',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    })

    if (result.canceled || !result.filePath) return { success: false }

    const dbPath = path.join(__dirname, '../../prisma/pos.db')
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, result.filePath)
    }

    return { success: true, path: result.filePath }
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
