import { ipcMain } from 'electron'
import prisma from '../database/index'
import { getCurrentUser } from './auth.handler'

export function registerInventoryHandlers() {
  ipcMain.handle('inventory:getMovements', async (_e, variantId?: string) => {
    const where: Record<string, unknown> = { isDeleted: false }
    if (variantId) where.variantId = variantId
    return prisma.inventoryMovement.findMany({
      where,
      include: { variant: { include: { product: true } }, user: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
  })

  ipcMain.handle('inventory:adjust', async (_e, data: {
    variantId: string
    quantity: number
    reason: string
    reference?: string
  }) => {
    const user = getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    return prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({ where: { id: data.variantId } })
      if (!variant) throw new Error('Variant not found')

      const previousQty = variant.stockQuantity
      const newQty = previousQty + data.quantity

      if (newQty < 0) throw new Error('Resulting stock cannot be negative')

      await tx.productVariant.update({
        where: { id: data.variantId },
        data: { stockQuantity: newQty },
      })

      const movement = await tx.inventoryMovement.create({
        data: {
          variantId: data.variantId,
          userId: user.id,
          type: data.quantity > 0 ? 'stock_in' : 'stock_out',
          quantity: data.quantity,
          previousQty,
          newQty,
          reason: data.reason,
          reference: data.reference,
        },
      })

      await logActivity('adjust', 'Inventory', data.variantId, data.reason)
      return movement
    })
  })

  ipcMain.handle('inventory:getLowStock', async () => {
    const variants = await prisma.productVariant.findMany({
      where: { isDeleted: false },
    })
    return variants.filter(v => v.stockQuantity <= v.lowStockAlert)
  })
}

async function logActivity(action: string, entity: string, entityId?: string, details?: string) {
  const user = getCurrentUser()
  if (user) {
    await prisma.activityLog.create({
      data: { userId: user.id, action, entity, entityId, details },
    })
  }
}
