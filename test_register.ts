import { registerUserAction } from './src/app/actions/auth.actions';
import { prisma } from './src/lib/db/prisma';
import bcrypt from 'bcryptjs';

async function run() {
  const ts = Date.now();
  const email = `test${ts}@example.com`;
  const username = `testuser${ts}`;
  const password = `Password123!`;
  
  console.log('Registering user...');
  const res = await registerUserAction({
    firstName: 'Test',
    lastName: 'User',
    username,
    email,
    businessName: 'Test Business',
    businessType: 'RETAIL',
    city: 'Test City',
    country: 'Test Country',
    password,
    confirmPassword: password
  });
  
  console.log('Registration result:', res);
  
  if (res.success) {
    console.log('Now checking DB directly...');
    const user = await prisma.user.findFirst({ where: { email } });
    if (user && user.password) {
      console.log('Password hash in DB:', user.password);
      console.log('Bcrypt verify:', await bcrypt.compare(password, user.password));
    }
  }
}

run().catch(console.error);
