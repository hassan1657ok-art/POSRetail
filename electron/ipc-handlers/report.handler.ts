import { ipcMain } from 'electron'
import prisma from '../database/index'

export function registerReportHandlers() {
  ipcMain.handle('reports:salesSummary', async (_e, startDate: string, endDate: string) => {
    const sales = await prisma.sale.findMany({
      where: {
        isDeleted: false,
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      include: { items: true, payments: true },
    })

    const totalSales = sales.length
    const totalRevenue = sales.reduce((s, sale) => s + sale.grandTotal, 0)
    const totalDiscounts = sales.reduce((s, sale) => s + sale.discountAmt, 0)
    const totalTax = sales.reduce((s, sale) => s + sale.taxAmt, 0)

    const byPaymentMethod: Record<string, number> = {}
    sales.forEach(sale => {
      sale.payments.forEach(p => {
        byPaymentMethod[p.method] = (byPaymentMethod[p.method] || 0) + p.amount
      })
    })

    return { totalSales, totalRevenue, totalDiscounts, totalTax, byPaymentMethod, sales }
  })

  ipcMain.handle('reports:profitLoss', async (_e, startDate: string, endDate: string) => {
    const sales = await prisma.sale.findMany({
      where: {
        isDeleted: false,
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      include: { items: true },
    })

    let totalRevenue = 0
    let totalCost = 0

    for (const sale of sales) {
      totalRevenue += sale.grandTotal
      for (const item of sale.items) {
        const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } })
        if (variant) {
          totalCost += variant.costPrice * item.quantity
        }
      }
    }

    return {
      totalRevenue,
      totalCost,
      grossProfit: totalRevenue - totalCost,
      margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100) : 0,
    }
  })

  ipcMain.handle('reports:inventoryValuation', async () => {
    const variants = await prisma.productVariant.findMany({
      where: { isDeleted: false },
      include: { product: true },
    })

    let totalCostValue = 0
    let totalRetailValue = 0

    variants.forEach(v => {
      totalCostValue += v.costPrice * v.stockQuantity
      totalRetailValue += v.sellingPrice * v.stockQuantity
    })

    return { totalItems: variants.length, totalCostValue, totalRetailValue, variants }
  })

  ipcMain.handle('reports:topProducts', async (_e, startDate: string, endDate: string, limit: number = 10) => {
    const saleItems = await prisma.saleItem.groupBy({
      by: ['variantId'],
      where: {
        isDeleted: false,
        sale: {
          isDeleted: false,
          createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
        },
      },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    })

    const result = await Promise.all(
      saleItems.map(async item => {
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: true },
        })
        return {
          ...item,
          variant,
        }
      })
    )

    return result
  })

  ipcMain.handle('reports:cashierSummary', async (_e, startDate: string, endDate: string) => {
    const result = await prisma.sale.groupBy({
      by: ['userId'],
      where: {
        isDeleted: false,
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      _count: { id: true },
      _sum: { grandTotal: true },
    })

    const withUsers = await Promise.all(
      result.map(async r => {
        const user = await prisma.user.findUnique({ where: { id: r.userId }, select: { fullName: true, username: true } })
        return { ...r, user }
      })
    )

    return withUsers
  })
}
