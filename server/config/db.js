const { Pool } = require('pg');
const ENV = require('./env');

const pool = new Pool({
  connectionString: ENV.DB_URL,
  max: 20, // max clients in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;