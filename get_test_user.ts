import { prisma } from './src/lib/db/prisma';
async function main() {
  const user = await prisma.user.findFirst();
  console.log('TEST_USER_EMAIL:', user?.email);
}
main().catch(console.error);
