const { getDb } = require('../config/db');

function dbMiddleware(req, res, next) {
  const { sequelize, models } = getDb();
  req.db     = sequelize;
  req.models = models;
  next();
}

module.exports = dbMiddleware;
