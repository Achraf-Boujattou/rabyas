import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class LigneCommandeFournisseur extends Model {}

LigneCommandeFournisseur.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    commandeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    articleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quantiteCommandee: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: false,
      validate: { min: 0.001 },
    },
    quantiteRecue: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
  },
  {
    sequelize,
    modelName: 'LigneCommandeFournisseur',
    tableName: 'lignes_commandes_fournisseurs',
  }
);

export default LigneCommandeFournisseur;
