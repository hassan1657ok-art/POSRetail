import { ipcMain } from 'electron'
import prisma from '../database/index'
import bcryptjs from 'bcryptjs'

let currentUser: { id: string; username: string; fullName: string; role: string; businessId: string } | null = null

export function registerAuthHandlers() {
  ipcMain.handle('auth:login', async (_event, username: string, password: string) => {
    const user = await prisma.user.findUnique({
      where: { username, isDeleted: false },
      include: { role: true, business: true },
    })
    if (!user) throw new Error('Invalid credentials')
    if (!user.isActive) throw new Error('Account is deactivated')

    const valid = await bcryptjs.compare(password, user.passwordHash)
    if (!valid) throw new Error('Invalid credentials')

    currentUser = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role.name,
      businessId: user.businessId,
    }

    await prisma.activityLog.create({
      data: { userId: user.id, action: 'login', entity: 'User', entityId: user.id },
    })

    return currentUser
  })

  ipcMain.handle('auth:logout', async () => {
    if (currentUser) {
      await prisma.activityLog.create({
        data: { userId: currentUser.id, action: 'logout', entity: 'User', entityId: currentUser.id },
      })
    }
    currentUser = null
    return { success: true }
  })

  ipcMain.handle('auth:currentUser', () => {
    return currentUser
  })
}

export function getCurrentUser() {
  return currentUser
}
