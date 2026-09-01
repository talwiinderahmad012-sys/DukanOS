const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:ahmad@localhost:5432/dukaanos' });
pool.query('SELECT email FROM "User" LIMIT 1').then(res => {
  console.log('EMAIL:', res.rows[0].email);
  pool.end();
});
