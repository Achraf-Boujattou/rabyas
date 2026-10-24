import sequelize from '../config/database.js';
import User from './User.js';
import Article from './Article.js';
import Equipement from './Equipement.js';
import MouvementStock from './MouvementStock.js';

Article.hasMany(Equipement, {
  as: 'equipements',
  foreignKey: 'articleId',
  onDelete: 'RESTRICT',
});
Equipement.belongsTo(Article, { as: 'article', foreignKey: 'articleId' });

Article.hasMany(MouvementStock, {
  as: 'mouvements',
  foreignKey: 'articleId',
  onDelete: 'RESTRICT',
});
MouvementStock.belongsTo(Article, { as: 'article', foreignKey: 'articleId' });
Equipement.hasMany(MouvementStock, {
  as: 'mouvements',
  foreignKey: 'equipementId',
  onDelete: 'RESTRICT',
});
MouvementStock.belongsTo(Equipement, {
  as: 'equipement',
  foreignKey: 'equipementId',
});

export { sequelize, User, Article, Equipement, MouvementStock };

export default {
  sequelize,
  User,
  Article,
  Equipement,
  MouvementStock,
};
