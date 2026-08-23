import { prisma } from './src/lib/db/prisma';
async function main() {
  const models = ['user', 'business', 'businessMembership', 'branch', 'product', 'category', 'supplier', 'customer', 'sale', 'saleItem', 'purchase', 'purchaseItem', 'employee', 'employeeAttendance', 'employeeSalary', 'payroll', 'feedback', 'productFeedback', 'stockMovement', 'auditLog', 'plan', 'businessSubscription'];
  for (const m of models) {
    if ((prisma as any)[m]) {
      try {
        const count = await (prisma as any)[m].count();
        console.log(m + ': ' + count);
      } catch (e: any) {
        console.log(m + ': ERROR - ' + e.message);
      }
    } else {
      console.log(m + ': MISSING_MODEL');
    }
  }
}
main().finally(() => process.exit(0));
