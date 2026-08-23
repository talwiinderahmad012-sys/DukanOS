const { PrismaClient } = require('../generated/prisma/index.js');
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS " CommunicationMessage\ CASCADE;');
 await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS \MessageTemplate\ CASCADE;');
 await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS \MessageAutomation\ CASCADE;');
 await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS \CommunicationProviderConfig\ CASCADE;');
 console.log('Tables dropped');
}
main().finally(() => prisma.$disconnect());
