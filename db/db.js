const { Pool } = require('pg');

// Database Pool
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    port: 5432,
});

module.exports = pool;
