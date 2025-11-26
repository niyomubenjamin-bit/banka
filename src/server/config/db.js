const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

const pool = connectionString
  ? new Pool({ connectionString })
  : new Pool({
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT) || 5432,
      database: process.env.PGDATABASE || 'banka_db',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || '',
    });

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL client error', err);
  process.exit(1);
});

async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('executed query', { text, duration, rows: result.rowCount });
  return result;
}

module.exports = {
  pool,
  query,
};
