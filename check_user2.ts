import { prisma } from './src/lib/db/prisma'; prisma.user.findFirst().then(console.log).catch(console.error).finally(() => process.exit(0));
