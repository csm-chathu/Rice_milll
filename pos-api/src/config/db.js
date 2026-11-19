const { Sequelize } = require('sequelize');
const getModels = require('../models');

let _sequelize = null;
let _models = null;

function getDb() {
  if (!_sequelize) {
    _sequelize = new Sequelize(
      process.env.DB_NAME || 'rice_mill',
      process.env.DB_USER || 'root',
      process.env.DB_PASS || 'root',
      {
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306'),
        dialect: 'mysql',
        logging: false,
        pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
        define: {
          timestamps: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
          underscored: true,
        },
      }
    );
    _models = getModels(_sequelize);
  }
  return { sequelize: _sequelize, models: _models };
}

module.exports = { getDb };
