
const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const applySchema = async () => {
  const pool = new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  });

  try {
    const schemaPath = path.join(__dirname, 'db', 'schema.sql');
    const schemaSql = await fs.readFile(schemaPath, 'utf-8');
    
    console.log('Connecting to the database...');
    const client = await pool.connect();
    console.log('Connection successful. Applying schema...');
    
    await client.query(schemaSql);
    
    console.log('Schema applied successfully.');
    client.release();
  } catch (error) {
    console.error('Error applying schema:', error);
  } finally {
    await pool.end();
  }
};

applySchema();
