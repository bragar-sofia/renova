require('dotenv').config();

module.exports = {
  prod: {
    driver: 'pg',
    host: 'db',
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: 5432
  }
};
