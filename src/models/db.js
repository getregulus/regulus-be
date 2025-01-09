const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: isProduction
  ? { rejectUnauthorized: false }
  : false,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
