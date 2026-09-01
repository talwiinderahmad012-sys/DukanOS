import { prisma } from './src/lib/db/prisma';
prisma.user.findUnique({ where: { email: 'admin@dukaanos.com' } })
  .then(u => {
    console.log(u ? 'Found: ' + u.email + '\nHash: ' + u.password : 'Not found');
    process.exit(0);
  })
  .catch(console.error);
