const { Sequelize } = require('sequelize');

const requiredEnv = ['DB_HOST', 'DB_NAME', 'DB_USER'];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Falta variable de entorno obligatoria: ${key}`);
  }
});

const isLocal = process.env.NODE_ENV === 'local';

console.log('DB CONFIG:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  environment: process.env.NODE_ENV || 'sin NODE_ENV'
});

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



/*const conectionString = "mysql://root:CAtFaezrXbDgIiaknlKQZhCYaoMhKHjK@tramway.proxy.rlwy.net:16455/railway";
const sequelize = new Sequelize(conectionString, {
  dialect: 'mysql',
  logging: false, // Desactiva los logs de Sequelize
  dialectOptions: process.env.DATABASE_URL || {
    ssl: {
      rejectUnauthorized: false // Permite conexiones SSL sin verificar el certificado
    }
  }
});
 
module.exports = sequelize;
//mysql://root:CAtFaezrXbDgIiaknlKQZhCYaoMhKHjK@tramway.proxy.rlwy.net:16455/railway*/