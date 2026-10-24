import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const {
  DB_HOST = '127.0.0.1',
  DB_PORT = 3306,
  DB_NAME = 'gestion_stock_telecom',
  DB_USER = 'root',
  DB_PASSWORD = '',
  NODE_ENV = 'development',
} = process.env;

export const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: Number(DB_PORT),
  dialect: 'mysql',
  logging: NODE_ENV === 'development' ? (msg) => console.log(`[Sequelize] ${msg}`) : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
  },
});

export const connectDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log(`[Database] Connexion réussie à MySQL (${DB_NAME}@${DB_HOST}:${DB_PORT})`);
  } catch (error) {
    console.error('[Database] Erreur de connexion à la base de données :', error.message);
    throw error;
  }
};

export default sequelize;
