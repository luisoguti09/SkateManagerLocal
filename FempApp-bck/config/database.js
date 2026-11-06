const { Sequelize } = require('sequelize');

const requiredEnv = ['DB_HOST', 'DB_NAME', 'DB_USER'];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Falta variable de entorno obligatoria: ${key}`);
  }
});

const isLocal = process.env.NODE_ENV === 'local';

void 0;

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: false,
    dialectOptions: isLocal
      ? {}
      : {
          ssl: {
            rejectUnauthorized: false
          }
        }
  }
);

module.exports = sequelize;
