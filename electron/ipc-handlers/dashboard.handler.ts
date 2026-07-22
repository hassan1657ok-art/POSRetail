import { ipcMain } from 'electron'
import prisma from '../database/index'

export function registerDashboardHandlers() {
  ipcMain.handle('dashboard:stats', async () => {
    const [productCount, customerCount, salesToday, lowStock] = await Promise.all([
      prisma.product.count({ where: { isDeleted: false } }),
      prisma.customer.count({ where: { isDeleted: false } }),
      prisma.sale.findMany({
        where: {
          isDeleted: false,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        select: { grandTotal: true },
      }),
      prisma.productVariant.findMany({
        where: {
          isDeleted: false,
          stockQuantity: { lte: prisma.productVariant.fields.lowStockAlert },
        },
        include: { product: true },
        orderBy: { stockQuantity: 'asc' },
      }),
    ])

    const totalSalesToday = salesToday.reduce((s, sale) => s + sale.grandTotal, 0)

    const recentSales = await prisma.sale.findMany({
      where: { isDeleted: false },
      include: { customer: true, user: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    const pendingNotifications = await prisma.notification.count({
      where: { isDeleted: false, isRead: false },
    })

    return {
      productCount,
      customerCount,
      salesTodayCount: salesToday.length,
      totalSalesToday,
      lowStockItems: lowStock,
      recentSales,
      pendingNotifications,
    }
  })
}
