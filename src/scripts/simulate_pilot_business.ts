export {};

// Load environment variables for standalone execution
require('dotenv').config();

// Stub 'server-only' for standalone node script execution
const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...args: any[]) {
  if (id === 'server-only') {
    return {};
  }
  return origRequire.apply(this, [id, ...args]);
};

async function main() {
  console.log('--- STARTING STEP 21: REAL-WORLD PILOT BUSINESS SIMULATION ---');

  const { prisma } = await import('../lib/db/prisma');
  const { createBusinessForUser } = await import('../services/business/context');
  const { createProduct } = await import('../services/products');
  const { createPurchase } = await import('../services/purchases');
  const { createSale } = await import('../services/sales');
  const { createCustomer, recordCustomerPayment } = await import('../services/customers');
  const { createEmployee } = await import('../services/employees');
  const { generateFeedbackInviteToken, submitCustomerFeedback } = await import('../services/feedback');
  const { PaymentMethod, FeedbackCategory } = await import('../generated/prisma/client');
  const bcrypt = (await import('bcryptjs')).default;

  // ==========================================
  // 1. Create Pilot Owner & Store
  // ==========================================
  console.log('\n--- 1. Provisioning Pilot Store: Madina Karyana & General Store ---');
  const hashedPassword = await bcrypt.hash('PilotStorePass123!', 10);
  const ownerUser = await prisma.user.create({
    data: {
      name: 'Haji Muhammad Aslam',
      email: `owner.pilot.${Date.now()}@dukaanos.local`,
      password: hashedPassword,
      phone: '0300-1234567',
    },
  });

  const pilotBusinessResult = await createBusinessForUser(ownerUser.id, {
    name: 'Madina Karyana & General Store',
    type: 'RETAIL',
    phone: '0300-1234567',
    address: 'Shop # 14, Main Bazaar, Near Ghanta Ghar',
    city: 'Layyah',
    branchName: 'Main Store',
    branchCode: 'MAIN',
  });

  const businessId = pilotBusinessResult.business.id;
  const branchId = pilotBusinessResult.branch.id;
  console.log(`✓ Pilot store created (ID: ${businessId}, Branch: ${branchId})`);

  // ==========================================
  // 2. Create Realistic Product Categories
  // ==========================================
  console.log('\n--- 2. Setting Up Retail Product Categories ---');
  const categoryNames = [
    'Staples & Grains',
    'Beverages & Juices',
    'Dairy & Eggs',
    'Snacks & Confectionery',
    'Personal Care & Hygiene',
    'Household & Cleaning',
  ];

  const categories: Record<string, string> = {};
  for (const catName of categoryNames) {
    const cat = await prisma.category.create({
      data: {
        businessId,
        name: catName,
      },
    });
    categories[catName] = cat.id;
  }
  console.log(`✓ Created ${Object.keys(categories).length} product categories.`);

  // ==========================================
  // 3. Create 10 Realistic Suppliers
  // ==========================================
  console.log('\n--- 3. Setting Up Wholesale Suppliers ---');
  const supplierData = [
    { name: 'National Foods Distribution Ltd', phone: '0301-1110001', address: 'Grain Market, Multan' },
    { name: 'Engro Foods Supply Depot', phone: '0301-1110002', address: 'Industrial Area, Multan' },
    { name: 'Unilever Wholesale Distributors', phone: '0301-1110003', address: 'Bypass Road, Layyah' },
    { name: 'Nestle Pakistan Direct Agency', phone: '0301-1110004', address: 'Khanewal Road, Multan' },
    { name: 'Shan Foods Regional Agent', phone: '0301-1110005', address: 'Grain Market, Layyah' },
    { name: 'Reckitt Benckiser Depot', phone: '0301-1110006', address: 'Chowk Azam Road, Layyah' },
    { name: 'Tapal Tea Distribution Network', phone: '0301-1110007', address: 'City Centre, Multan' },
    { name: 'P&G Wholesale Agency', phone: '0301-1110008', address: 'Railway Road, Layyah' },
    { name: 'Dalda Foods Supply Co.', phone: '0301-1110009', address: 'Vehari Road, Multan' },
    { name: 'Local Flour & Grain Millers', phone: '0301-1110010', address: 'Kot Sultan, Layyah' },
  ];

  const suppliers = [];
  for (const s of supplierData) {
    const createdSupplier = await prisma.supplier.create({
      data: {
        businessId,
        name: s.name,
        phone: s.phone,
        address: s.address,
      },
    });
    suppliers.push(createdSupplier);
  }
  console.log(`✓ Created ${suppliers.length} wholesale suppliers.`);

  // ==========================================
  // 4. Create 30+ Realistic Retail Products
  // ==========================================
  console.log('\n--- 4. Creating Realistic Product Catalog ---');
  const productCatalog = [
    // Staples
    { name: 'Super Kernel Basmati Rice 5kg', sku: 'RICE-BAS-5KG', barcode: '896400010001', purchasePrice: 1650, sellingPrice: 1950, minStock: 10, cat: 'Staples & Grains' },
    { name: 'Chakki Atta (Whole Wheat Flour) 10kg', sku: 'ATTA-WHT-10KG', barcode: '896400010002', purchasePrice: 1250, sellingPrice: 1400, minStock: 15, cat: 'Staples & Grains' },
    { name: 'Daal Chana (Gram Pulse) 1kg', sku: 'DAAL-CHANA-1KG', barcode: '896400010003', purchasePrice: 240, sellingPrice: 290, minStock: 20, cat: 'Staples & Grains' },
    { name: 'Daal Moong Washed 1kg', sku: 'DAAL-MOONG-1KG', barcode: '896400010004', purchasePrice: 280, sellingPrice: 340, minStock: 15, cat: 'Staples & Grains' },
    { name: 'Refined White Sugar 5kg', sku: 'SUGAR-REF-5KG', barcode: '896400010005', purchasePrice: 650, sellingPrice: 750, minStock: 20, cat: 'Staples & Grains' },
    { name: 'Dalda Banaspati Ghee 1kg Pouch', sku: 'DALDA-GHEE-1KG', barcode: '896400010006', purchasePrice: 510, sellingPrice: 560, minStock: 25, cat: 'Staples & Grains' },
    { name: 'Mezan Canola Cooking Oil 1L', sku: 'MEZAN-OIL-1L', barcode: '896400010007', purchasePrice: 480, sellingPrice: 530, minStock: 25, cat: 'Staples & Grains' },
    { name: 'National Himalayan Pink Salt 800g', sku: 'NAT-SALT-800G', barcode: '896400010008', purchasePrice: 65, sellingPrice: 85, minStock: 30, cat: 'Staples & Grains' },
    // Beverages
    { name: 'Tapal Danedar Tea 450g', sku: 'TAPAL-TEA-450G', barcode: '896400020001', purchasePrice: 620, sellingPrice: 720, minStock: 20, cat: 'Beverages & Juices' },
    { name: 'Lipton Yellow Label Tea 400g', sku: 'LIPTON-TEA-400G', barcode: '896400020002', purchasePrice: 590, sellingPrice: 680, minStock: 15, cat: 'Beverages & Juices' },
    { name: 'Nestle Everyday Milk Powder 375g', sku: 'NESTLE-EVRDY-375', barcode: '896400020003', purchasePrice: 440, sellingPrice: 510, minStock: 20, cat: 'Beverages & Juices' },
    { name: 'Rooh Afza Syrup 800ml Bottle', sku: 'ROOH-AFZA-800ML', barcode: '896400020004', purchasePrice: 380, sellingPrice: 440, minStock: 15, cat: 'Beverages & Juices' },
    { name: 'Coca-Cola 1.5L PET Bottle', sku: 'COKE-PET-1.5L', barcode: '896400020005', purchasePrice: 170, sellingPrice: 200, minStock: 30, cat: 'Beverages & Juices' },
    { name: 'Sprite 1.5L PET Bottle', sku: 'SPRITE-PET-1.5L', barcode: '896400020006', purchasePrice: 170, sellingPrice: 200, minStock: 30, cat: 'Beverages & Juices' },
    // Dairy
    { name: 'Olpers UHT Whole Milk 1L', sku: 'OLPERS-MILK-1L', barcode: '896400030001', purchasePrice: 270, sellingPrice: 310, minStock: 40, cat: 'Dairy & Eggs' },
    { name: 'MilkPak Whole Milk 1L', sku: 'MILKPAK-1L', barcode: '896400030002', purchasePrice: 270, sellingPrice: 310, minStock: 40, cat: 'Dairy & Eggs' },
    { name: 'Nurpur Salted Butter 200g', sku: 'NURPUR-BUTTER-200G', barcode: '896400030003', purchasePrice: 290, sellingPrice: 350, minStock: 15, cat: 'Dairy & Eggs' },
    { name: 'Fresh Farm Eggs (Crate of 30)', sku: 'EGGS-CRATE-30', barcode: '896400030004', purchasePrice: 660, sellingPrice: 780, minStock: 10, cat: 'Dairy & Eggs' },
    // Snacks
    { name: 'Lays Masala Potato Chips 40g', sku: 'LAYS-MASALA-40G', barcode: '896400040001', purchasePrice: 42, sellingPrice: 50, minStock: 50, cat: 'Snacks & Confectionery' },
    { name: 'Kurkure Chutney Chaska 40g', sku: 'KURKURE-40G', barcode: '896400040002', purchasePrice: 42, sellingPrice: 50, minStock: 50, cat: 'Snacks & Confectionery' },
    { name: 'LU Prince Chocolate Biscuits Half Roll', sku: 'PRINCE-BISC-HR', barcode: '896400040003', purchasePrice: 38, sellingPrice: 45, minStock: 40, cat: 'Snacks & Confectionery' },
    { name: 'Peek Freans Sooper Biscuits Half Roll', sku: 'SOOPER-BISC-HR', barcode: '896400040004', purchasePrice: 38, sellingPrice: 45, minStock: 40, cat: 'Snacks & Confectionery' },
    // Personal Care
    { name: 'Lifebuoy Total Soap Bar 115g', sku: 'LIFEBUOY-SOAP-115', barcode: '896400050001', purchasePrice: 110, sellingPrice: 135, minStock: 30, cat: 'Personal Care & Hygiene' },
    { name: 'Lux Rose Soap Bar 115g', sku: 'LUX-ROSE-115G', barcode: '896400050002', purchasePrice: 125, sellingPrice: 150, minStock: 30, cat: 'Personal Care & Hygiene' },
    { name: 'Head & Shoulders Shampoo 180ml', sku: 'HS-SHAMPOO-180ML', barcode: '896400050003', purchasePrice: 380, sellingPrice: 450, minStock: 15, cat: 'Personal Care & Hygiene' },
    { name: 'Colgate Maximum Cavity Protection 100g', sku: 'COLGATE-100G', barcode: '896400050004', purchasePrice: 180, sellingPrice: 220, minStock: 25, cat: 'Personal Care & Hygiene' },
    // Household & Cleaning
    { name: 'Surf Excel Washing Powder 1kg', sku: 'SURF-EXCEL-1KG', barcode: '896400060001', purchasePrice: 490, sellingPrice: 570, minStock: 25, cat: 'Household & Cleaning' },
    { name: 'Bonus Tristar Washing Powder 1kg', sku: 'BONUS-WASH-1KG', barcode: '896400060002', purchasePrice: 260, sellingPrice: 300, minStock: 30, cat: 'Household & Cleaning' },
    { name: 'Vim Dishwash Bar 100g', sku: 'VIM-BAR-100G', barcode: '896400060003', purchasePrice: 45, sellingPrice: 60, minStock: 40, cat: 'Household & Cleaning' },
    { name: 'Dettol Disinfectant Liquid 250ml', sku: 'DETTOL-250ML', barcode: '896400060004', purchasePrice: 320, sellingPrice: 380, minStock: 15, cat: 'Household & Cleaning' },
  ];

  const products: any[] = [];
  for (const p of productCatalog) {
    const prod = await createProduct(businessId, ownerUser.id, {
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      categoryId: categories[p.cat],
      purchasePrice: p.purchasePrice,
      sellingPrice: p.sellingPrice,
      minStockThreshold: p.minStock,
    });
    products.push({ ...prod, origData: p });
  }
  console.log(`✓ Created ${products.length} realistic retail products in database.`);

  // ==========================================
  // 5. Create 15 Realistic Customers
  // ==========================================
  console.log('\n--- 5. Creating Retail Customers ---');
  const customerList = [
    { name: 'Chaudhry Tariq Mehmood', phone: '0300-8880001', address: 'Model Town, Layyah' },
    { name: 'Malik Zafar Iqbal', phone: '0300-8880002', address: 'Bypass Road, Layyah' },
    { name: 'Rana Naveed Akhtar', phone: '0300-8880003', address: 'Civil Lines, Layyah' },
    { name: 'Sheikh Bilal Ahmed', phone: '0300-8880004', address: 'Main Market, Layyah' },
    { name: 'Dr. Shahzad Rasheed', phone: '0300-8880005', address: 'Hospital Road, Layyah' },
    { name: 'Master Irfan Ullah', phone: '0300-8880006', address: 'Chowk Azam, Layyah' },
    { name: 'Mian Usman Farooq', phone: '0300-8880007', address: 'Grain Market, Layyah' },
    { name: 'Haji Ghulam Shabbir', phone: '0300-8880008', address: 'Old City, Layyah' },
    { name: 'Subedar Riaz Hussain', phone: '0300-8880009', address: 'Defense Colony, Layyah' },
    { name: 'Qari Abdul Ghafoor', phone: '0300-8880010', address: 'Madina Town, Layyah' },
    { name: 'Chaudhry Waseem Akram', phone: '0300-8880011', address: 'Railway Colony, Layyah' },
    { name: 'Engineer Hamza Tariq', phone: '0300-8880012', address: 'Gulberg Colony, Layyah' },
    { name: 'Sardar Jahangir Khan', phone: '0300-8880013', address: 'Kot Sultan Road, Layyah' },
    { name: 'Advocate Munir Ahmed', phone: '0300-8880014', address: 'Courts Area, Layyah' },
    { name: 'Professor Kamran Sadiq', phone: '0300-8880015', address: 'College Road, Layyah' },
  ];

  const customers = [];
  for (const c of customerList) {
    const cust = await createCustomer(businessId, ownerUser.id, {
      name: c.name,
      phone: c.phone,
      address: c.address,
    });
    customers.push(cust);
  }
  console.log(`✓ Created ${customers.length} retail customer accounts.`);

  // ==========================================
  // 6. Procurement: Stock Influx via Purchases
  // ==========================================
  console.log('\n--- 6. Executing Procurement Orders (Stock Influx) ---');
  // Create 10 bulk purchase orders across suppliers to stock all products
  for (let i = 0; i < products.length; i += 3) {
    const chunk = products.slice(i, i + 3);
    const supplier = suppliers[(i / 3) % suppliers.length];
    
    const items = chunk.map((p) => ({
      productId: p.id,
      quantity: 50, // 50 units each
      purchasePrice: p.origData.purchasePrice,
    }));

    const totalCost = items.reduce((sum, item) => sum + item.quantity * item.purchasePrice, 0);

    await createPurchase({
      businessId,
      branchId,
      supplierId: supplier.id,
      userId: ownerUser.id,
      paidAmount: totalCost,
      items,
      notes: `Wholesale procurement from ${supplier.name}`,
    });
  }
  console.log(`✓ Completed 10 wholesale procurement shipments. All products stocked with 50 units each.`);

  // ==========================================
  // 7. Simulating 30 Realistic POS Sales & Udhaar Cycles
  // ==========================================
  console.log('\n--- 7. Simulating Busy Retail Sales & Udhaar Transactions ---');
  let totalCashSales = 0;
  let totalCreditSales = 0;

  for (let i = 0; i < 30; i++) {
    // Pick 2 random products
    const prod1 = products[i % products.length];
    const prod2 = products[(i + 7) % products.length];

    const qty1 = 1 + (i % 3); // 1 to 3 units
    const qty2 = 1 + (i % 2); // 1 to 2 units

    const lineTotal1 = qty1 * prod1.origData.sellingPrice;
    const lineTotal2 = qty2 * prod2.origData.sellingPrice;
    const saleTotal = lineTotal1 + lineTotal2;

    const isCredit = i % 3 === 0; // Every 3rd customer takes Udhaar
    const customer = customers[i % customers.length];

    if (isCredit) {
      // Partial credit sale (pay half cash, half udhaar)
      const paid = Math.floor(saleTotal / 2);
      await createSale({
        businessId,
        branchId,
        customerId: customer.id,
        userId: ownerUser.id,
        paymentMethod: PaymentMethod.CREDIT,
        paidAmount: paid,
        items: [
          { productId: prod1.id, quantity: qty1, sellingPrice: prod1.origData.sellingPrice },
          { productId: prod2.id, quantity: qty2, sellingPrice: prod2.origData.sellingPrice },
        ],
      });
      totalCreditSales += saleTotal;
    } else {
      // Full Cash Sale
      await createSale({
        businessId,
        branchId,
        userId: ownerUser.id,
        paymentMethod: PaymentMethod.CASH,
        paidAmount: saleTotal,
        items: [
          { productId: prod1.id, quantity: qty1, sellingPrice: prod1.origData.sellingPrice },
          { productId: prod2.id, quantity: qty2, sellingPrice: prod2.origData.sellingPrice },
        ],
      });
      totalCashSales += saleTotal;
    }
  }
  console.log(`✓ Processed 30 realistic sales (Cash Volume: Rs. ${totalCashSales}, Credit/Split Volume: Rs. ${totalCreditSales}).`);

  // ==========================================
  // 8. Simulating Customer Udhaar Recovery Payments
  // ==========================================
  console.log('\n--- 8. Simulating Customer Udhaar Recovery Payments ---');
  let recoveredUdhaar = 0;
  for (let i = 0; i < 5; i++) {
    const cust = customers[i];
    const freshCust = await prisma.customer.findUnique({ where: { id: cust.id } });
    if (freshCust && Number(freshCust.outstanding) > 0) {
      const payAmount = Math.floor(Number(freshCust.outstanding) * 0.7); // Pay 70% of balance
      if (payAmount > 0) {
        await recordCustomerPayment(
          businessId,
          ownerUser.id,
          cust.id,
          payAmount,
          PaymentMethod.CASH,
          'Weekly Udhaar installment payment'
        );
        recoveredUdhaar += payAmount;
      }
    }
  }
  console.log(`✓ Reconciled customer debt payments: Rs. ${recoveredUdhaar} recovered.`);

  // ==========================================
  // 9. Staff Management & Attendance
  // ==========================================
  console.log('\n--- 9. Setting Up Staff & Attendance Records ---');
  const staffMembers = [
    { name: 'Muhammad Rizwan (Senior Cashier)', position: 'Head Cashier', salary: 35000 },
    { name: 'Ali Raza (Store Helper & Stock Keeper)', position: 'Stock Keeper', salary: 25000 },
  ];

  for (const s of staffMembers) {
    const emp = await createEmployee(businessId, ownerUser.id, {
      name: s.name,
      position: s.position,
      basicSalary: s.salary,
      branchId,
    });

    // Record attendance
    await prisma.employeeAttendance.create({
      data: {
        businessId,
        employeeId: emp.id,
        branchId,
        date: new Date(),
        status: 'PRESENT',
        recordedBy: ownerUser.id,
      },
    });
  }
  console.log(`✓ Registered staff members and logged attendance.`);

  // ==========================================
  // 10. Customer Feedback Verification
  // ==========================================
  console.log('\n--- 10. Simulating Customer Feedback & Ratings ---');
  const invite = await generateFeedbackInviteToken(businessId, {
    customerId: customers[0].id,
  });

  await submitCustomerFeedback(invite.token, {
    rating: 5,
    category: FeedbackCategory.SERVICE,
    message: 'Mashallah best general store in Layyah! Always fresh goods and polite staff.',
  });
  console.log(`✓ Feedback invite token generated and 5-star customer review verified.`);

  console.log('\n🎉 PILOT BUSINESS SIMULATION COMPLETED SUCCESSFULLY!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Pilot simulation failed:', err);
  process.exit(1);
});
