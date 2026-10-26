import sequelize from '../config/database.js';
import User from './User.js';
import Article from './Article.js';
import Equipement from './Equipement.js';
import MouvementStock from './MouvementStock.js';
import Fournisseur from './Fournisseur.js';
import CommandeFournisseur from './CommandeFournisseur.js';
import LigneCommandeFournisseur from './LigneCommandeFournisseur.js';

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
User.hasMany(MouvementStock, {
  as: 'mouvements',
  foreignKey: 'utilisateurId',
  onDelete: 'SET NULL',
});
MouvementStock.belongsTo(User, {
  as: 'utilisateur',
  foreignKey: 'utilisateurId',
});
MouvementStock.hasOne(MouvementStock, {
  as: 'annulation',
  foreignKey: 'mouvementInverseDeId',
  onDelete: 'RESTRICT',
});
MouvementStock.belongsTo(MouvementStock, {
  as: 'mouvementAnnule',
  foreignKey: 'mouvementInverseDeId',
});

Fournisseur.hasMany(CommandeFournisseur, {
  as: 'commandes',
  foreignKey: 'fournisseurId',
  onDelete: 'RESTRICT',
});
CommandeFournisseur.belongsTo(Fournisseur, {
  as: 'fournisseur',
  foreignKey: 'fournisseurId',
});
CommandeFournisseur.hasMany(LigneCommandeFournisseur, {
  as: 'lignes',
  foreignKey: 'commandeId',
  onDelete: 'CASCADE',
});
LigneCommandeFournisseur.belongsTo(CommandeFournisseur, {
  as: 'commande',
  foreignKey: 'commandeId',
});
Article.hasMany(LigneCommandeFournisseur, {
  as: 'lignesCommande',
  foreignKey: 'articleId',
  onDelete: 'RESTRICT',
});
LigneCommandeFournisseur.belongsTo(Article, {
  as: 'article',
  foreignKey: 'articleId',
});

export {
  sequelize,
  User,
  Article,
  Equipement,
  MouvementStock,
  Fournisseur,
  CommandeFournisseur,
  LigneCommandeFournisseur,
};

export default {
  sequelize,
  User,
  Article,
  Equipement,
  MouvementStock,
  Fournisseur,
  CommandeFournisseur,
  LigneCommandeFournisseur,
};
