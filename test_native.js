const { PrismaClient } = require('./src/generated/prisma/client/index.js');
const prisma = new PrismaClient();
prisma.user.findFirst().then(u => {
  console.log('NATIVE PRISMA SUCCESS:', u?.email);
  prisma.$disconnect();
}).catch(e => console.error(e));
