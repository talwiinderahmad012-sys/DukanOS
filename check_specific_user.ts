import { PrismaClient } from './src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: 'postgresql://postgres:ahmad@localhost:5432/dukaanos' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

prisma.user.findUnique({ where: { email: 'talwiinderahmad012@gmail.com' } }).then(u => {
    console.log(u ? 'User exists' : 'User DOES NOT exist');
    process.exit(0);
}).catch(console.error);
