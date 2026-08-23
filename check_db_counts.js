const { PrismaClient } = require('./src/generated/prisma');
const p = new PrismaClient();
async function main() {
  const models = [
    'user', 'business', 'businessMembership', 'branch', 'product', 'category', 'supplier',
    'customer', 'sale', 'saleItem', 'purchase', 'purchaseItem', 'employee', 'employeeAttendance',
    'employeeSalary', 'payroll', 'feedback', 'communicationMessage', 'productFeedback',
    'stockMovement', 'auditLog', 'plan', 'businessSubscription'
  ];
  for (const m of models) {
    if (p[m]) {
      const count = await p[m].count().catch(e => 'ERROR');
      console.log(`${m}: ${count}`);
    } else {
      console.log(`${m}: MODEL_MISSING_IN_CLIENT`);
    }
  }
}
main().finally(() => p.$disconnect());
