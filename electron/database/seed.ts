import prisma from './index'
import bcryptjs from 'bcryptjs'

export async function seedDatabase() {
  const roleCount = await prisma.role.count()
  if (roleCount > 0) {
    console.log('Database already seeded, skipping.')
    return
  }

  console.log('Seeding database...')

  const business = await prisma.business.create({
    data: {
      name: 'My Store',
      address: '123 Main Street',
      currency: 'PKR',
      taxRate: 0,
      taxName: 'Tax',
      receiptFooter: 'Thank you for shopping with us!',
    },
  })

  const adminRole = await prisma.role.create({
    data: {
      name: 'Admin',
      permissions: 'all',
    },
  })

  const cashierRole = await prisma.role.create({
    data: {
      name: 'Cashier',
      permissions: 'sales:create,sales:view,products:view,customers:view,customers:create',
    },
  })

  const passwordHash = await bcryptjs.hash('admin123', 10)

  await prisma.user.create({
    data: {
      businessId: business.id,
      roleId: adminRole.id,
      username: 'admin',
      passwordHash,
      fullName: 'System Admin',
      pin: '1234',
    },
  })

  const cashierHash = await bcryptjs.hash('cashier123', 10)

  await prisma.user.create({
    data: {
      businessId: business.id,
      roleId: cashierRole.id,
      username: 'cashier',
      passwordHash: cashierHash,
      fullName: 'Cashier User',
      pin: '5678',
    },
  })

  const category = await prisma.category.create({
    data: { name: 'General', slug: 'general' },
  })

  const brand = await prisma.brand.create({
    data: { name: 'Generic' },
  })

  await prisma.customer.create({
    data: { fullName: 'Walk-in Customer', isWalkIn: true },
  })

  const product = await prisma.product.create({
    data: {
      categoryId: category.id,
      brandId: brand.id,
      name: 'Sample Product',
      slug: 'sample-product',
    },
  })

  await prisma.productVariant.create({
    data: {
      productId: product.id,
      sku: 'SMP-001',
      barcode: '100000000001',
      name: 'Sample Product',
      costPrice: 500,
      sellingPrice: 750,
      stockQuantity: 50,
      lowStockAlert: 5,
    },
  })

  console.log('Database seeded successfully!')
}
