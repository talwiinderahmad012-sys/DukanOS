const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:ahmad@127.0.0.1:5432/dukaanos' });
pool.query('SELECT email FROM "User" LIMIT 1').then(res => {
  console.log('PG 127.0.0.1 SUCCESS:', res.rows[0].email);
  pool.end();
}).catch(console.error);
