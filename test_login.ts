import { prisma } from './src/lib/db/prisma';
import bcrypt from 'bcryptjs';

async function test() {
  const email = 'talwiinderahmad012@gmail.com';
  const password = 'Password123!';
  
  const user = await prisma.user.findFirst({
    where: { email }
  });
  
  console.log('User found:', !!user);
  if (user) {
    console.log('Has password:', !!user.password);
    if (user.password) {
      const isValid = await bcrypt.compare(password, user.password);
      console.log('Password valid:', isValid);
      console.log('Password hash:', user.password);
    }
  }
}
test().catch(console.error);
