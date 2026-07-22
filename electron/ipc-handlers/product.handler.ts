import { ipcMain } from 'electron'
import prisma from '../database/index'
import { getCurrentUser } from './auth.handler'

export function registerProductHandlers() {
  ipcMain.handle('products:getAll', async () => {
    return prisma.product.findMany({
      where: { isDeleted: false },
      include: {
        category: true,
        brand: true,
        variants: { where: { isDeleted: false } },
        images: { where: { isDeleted: false } },
      },
      orderBy: { updatedAt: 'desc' },
    })
  })

  ipcMain.handle('products:getById', async (_e, id: string) => {
    return prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        supplier: true,
        variants: { where: { isDeleted: false } },
        images: { where: { isDeleted: false } },
      },
    })
  })

  ipcMain.handle('products:create', async (_e, data: {
    categoryId: string
    brandId?: string
    supplierId?: string
    name: string
    slug: string
    description?: string
    variants?: { sku: string; barcode?: string; name: string; costPrice: number; sellingPrice: number; stockQuantity: number; lowStockAlert?: number }[]
  }) => {
    await logActivity('create', 'Product')
    return prisma.product.create({
      data: {
        categoryId: data.categoryId,
        brandId: data.brandId,
        supplierId: data.supplierId,
        name: data.name,
        slug: data.slug,
        description: data.description,
        variants: data.variants ? {
          create: data.variants.map(v => ({
            sku: v.sku,
            barcode: v.barcode,
            name: v.name,
            costPrice: v.costPrice,
            sellingPrice: v.sellingPrice,
            stockQuantity: v.stockQuantity,
            lowStockAlert: v.lowStockAlert || 5,
          })),
        } : undefined,
      },
      include: { variants: true },
    })
  })

  ipcMain.handle('products:update', async (_e, id: string, data: {
    categoryId?: string; brandId?: string; supplierId?: string; name?: string; slug?: string; description?: string; isActive?: boolean
  }) => {
    await logActivity('update', 'Product', id)
    return prisma.product.update({ where: { id }, data })
  })

  ipcMain.handle('products:delete', async (_e, id: string) => {
    await logActivity('delete', 'Product', id)
    return prisma.product.update({ where: { id }, data: { isDeleted: true } })
  })

  ipcMain.handle('products:search', async (_e, query: string) => {
    return prisma.product.findMany({
      where: {
        isDeleted: false,
        OR: [
          { name: { contains: query } },
          { slug: { contains: query } },
          { variants: { some: { sku: { contains: query }, isDeleted: false } } },
          { variants: { some: { barcode: { contains: query }, isDeleted: false } } },
        ],
      },
      include: {
        category: true,
        brand: true,
        variants: { where: { isDeleted: false } },
        images: { where: { isDeleted: false } },
      },
      take: 50,
    })
  })

  ipcMain.handle('variants:getByProduct', async (_e, productId: string) => {
    return prisma.productVariant.findMany({
      where: { productId, isDeleted: false },
    })
  })

  ipcMain.handle('variants:create', async (_e, data: {
    productId: string; sku: string; barcode?: string; name: string; costPrice: number; sellingPrice: number; stockQuantity: number; lowStockAlert?: number
  }) => {
    await logActivity('create', 'ProductVariant')
    return prisma.productVariant.create({ data })
  })

  ipcMain.handle('variants:update', async (_e, id: string, data: {
    sku?: string; barcode?: string; name?: string; costPrice?: number; sellingPrice?: number; lowStockAlert?: number; isActive?: boolean
  }) => {
    await logActivity('update', 'ProductVariant', id)
    return prisma.productVariant.update({ where: { id }, data })
  })

  ipcMain.handle('variants:delete', async (_e, id: string) => {
    await logActivity('delete', 'ProductVariant', id)
    return prisma.productVariant.update({ where: { id }, data: { isDeleted: true } })
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
