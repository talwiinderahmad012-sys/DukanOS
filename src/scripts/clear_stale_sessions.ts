import { prisma } from '../lib/db/prisma';

async function main() {
  const emails = ['talwiinderahmad012@gmail.com', 'ghamedahar012@gmail.com'];
  
  const users = await prisma.user.findMany({
    where: { email: { in: emails } }
  });

  console.log(`Found ${users.length} users.`);

  for (const user of users) {
    console.log(`Clearing sessions/accounts for ${user.email} (ID: ${user.id})`);
    
    const delSessions = await prisma.session.deleteMany({
      where: { userId: user.id }
    });
    console.log(`Deleted ${delSessions.count} sessions.`);
    
    const delAccounts = await prisma.account.deleteMany({
      where: { userId: user.id }
    });
    console.log(`Deleted ${delAccounts.count} accounts.`);
  }

  console.log("Done.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
