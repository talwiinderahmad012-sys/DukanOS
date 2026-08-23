import { BusinessType, BusinessStatus, MembershipRole, MovementType } from '../src/generated/prisma/client'
import { prisma } from '../src/lib/db/prisma'

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PRODUCTION_SEED) {
    console.error('CRITICAL: Seeding demo data into a production environment is strictly prohibited.');
    process.exit(1);
  }

  console.log('Seeding development database...')

  // 1. Create a User
  const user = await prisma.user.upsert({
    where: { email: 'admin@dukaanos.local' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@dukaanos.local',
    },
  })

  // 2. Create a Business
  const business = await prisma.business.create({
    data: {
      name: 'Super Mart Demo',
      type: BusinessType.RETAIL,
      status: BusinessStatus.ACTIVE,
      currency: 'PKR',
      timezone: 'Asia/Karachi',
    },
  })

  // 3. Create Membership
  await prisma.businessMembership.create({
    data: {
      userId: user.id,
      businessId: business.id,
      role: MembershipRole.OWNER,
    },
  })

  // 4. Create a Branch
  const branch = await prisma.branch.create({
    data: {
      businessId: business.id,
      name: 'Main Branch',
      code: 'MAIN-01',
      city: 'Lahore',
    },
  })

  // 5. Create a Category
  const category = await prisma.category.create({
    data: {
      businessId: business.id,
      name: 'Beverages',
      description: 'Drinks and juices',
    },
  })

  // 6. Create a Supplier
  const supplier = await prisma.supplier.create({
    data: {
      businessId: business.id,
      name: 'National Distributors Ltd',
      phone: '03000000000',
    },
  })

  // 7. Create a Product
  const product = await prisma.product.create({
    data: {
      businessId: business.id,
      categoryId: category.id,
      name: 'Mango Juice 1L',
      sku: 'BEV-MAN-1L',
      barcode: '1234567890123',
      purchasePrice: 150.00,
      sellingPrice: 200.00,
      currentStock: 50,
      minStockThreshold: 10,
    },
  })

  // 8. Create Opening Stock Movement
  await prisma.stockMovement.create({
    data: {
      businessId: business.id,
      branchId: branch.id,
      productId: product.id,
      movementType: MovementType.OPENING,
      quantity: 50,
      previousStock: 0,
      resultingStock: 50,
      notes: 'Initial seed stock',
    },
  })

  // 9. Create a Customer
  await prisma.customer.create({
    data: {
      businessId: business.id,
      name: 'Walk-in Customer',
      phone: '00000000000',
    },
  })

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
