const { PrismaClient } = require('./src/generated/prisma'); const prisma = new PrismaClient(); prisma.user.findFirst().then(console.log).catch(console.error).finally(() => process.exit(0));
