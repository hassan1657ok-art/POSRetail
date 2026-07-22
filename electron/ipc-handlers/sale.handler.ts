import { ipcMain } from 'electron'
import prisma from '../database/index'
import { getCurrentUser } from './auth.handler'

export function registerSaleHandlers() {
  ipcMain.handle('sales:getAll', async () => {
    return prisma.sale.findMany({
      where: { isDeleted: false },
      include: { customer: true, user: true, items: true, payments: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  })

  ipcMain.handle('sales:getById', async (_e, id: string) => {
    return prisma.sale.findUnique({
      where: { id },
      include: { customer: true, user: true, items: true, payments: true },
    })
  })

  ipcMain.handle('sales:create', async (_e, data: {
    customerId: string
    items: { variantId: string; productName: string; variantName: string; sku: string; quantity: number; unitPrice: number; discount: number }[]
    payments: { method: string; amount: number; reference?: string }[]
    discountRate?: number
    discountAmt?: number
    taxRate?: number
    note?: string
  }) => {
    const user = getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    const subtotal = data.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
    const discountAmt = data.discountAmt || (subtotal * (data.discountRate || 0) / 100)
    const afterDiscount = subtotal - discountAmt
    const taxRate = data.taxRate || 0
    const taxAmt = afterDiscount * taxRate / 100
    const grandTotal = afterDiscount + taxAmt
    const totalPaid = data.payments.reduce((s, p) => s + p.amount, 0)
    const change = Math.max(0, totalPaid - grandTotal)

    const invoiceNo = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    const sale = await prisma.$transaction(async (tx) => {
      for (const item of data.items) {
        const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } })
        if (!variant) throw new Error(`Variant ${item.sku} not found`)
        if (variant.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for ${item.productName} (${item.sku}). Available: ${variant.stockQuantity}`)
        }

        const previousQty = variant.stockQuantity
        const newQty = previousQty - item.quantity

        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: newQty },
        })

        await tx.inventoryMovement.create({
          data: {
            variantId: item.variantId,
            userId: user.id,
            type: 'sale',
            quantity: -item.quantity,
            previousQty,
            newQty,
            reason: `Sale: ${invoiceNo}`,
          },
        })
      }

      const created = await tx.sale.create({
        data: {
          customerId: data.customerId,
          userId: user.id,
          invoiceNo,
          subtotal,
          discountRate: data.discountRate || 0,
          discountAmt,
          taxRate,
          taxAmt,
          grandTotal,
          totalPaid,
          change,
          status: 'completed',
          note: data.note,
          items: {
            create: data.items.map(item => ({
              variantId: item.variantId,
              productName: item.productName,
              variantName: item.variantName,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              lineTotal: item.unitPrice * item.quantity - item.discount,
            })),
          },
          payments: {
            create: data.payments.map(p => ({
              method: p.method,
              amount: p.amount,
              reference: p.reference,
            })),
          },
        },
        include: { customer: true, user: true, items: true, payments: true },
      })

      const walkIn = await tx.customer.findFirst({ where: { isWalkIn: true } })
      if (walkIn && data.customerId !== walkIn.id) {
        await tx.customer.update({
          where: { id: data.customerId },
          data: { totalSpent: { increment: grandTotal } },
        })
      }

      return created
    })

    await logActivity('create', 'Sale', sale.id, `Invoice #${invoiceNo}`)
    return sale
  })

  ipcMain.handle('sales:getByDateRange', async (_e, startDate: string, endDate: string) => {
    return prisma.sale.findMany({
      where: {
        isDeleted: false,
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      include: { customer: true, user: true, items: true, payments: true },
      orderBy: { createdAt: 'desc' },
    })
  })

  ipcMain.handle('sales:getByInvoiceNo', async (_e, invoiceNo: string) => {
    return prisma.sale.findFirst({
      where: { invoiceNo, isDeleted: false },
      include: { customer: true, user: true, items: true, payments: true },
    })
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
