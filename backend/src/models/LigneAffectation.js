import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class LigneAffectation extends Model {}

LigneAffectation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    affectationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    articleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    equipementId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    quantite: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: false,
      validate: { min: 0.001 },
    },
    depotOrigine: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    etatAvant: {
      type: DataTypes.ENUM('neuf', 'en_service', 'en_panne', 'repare', 'reforme'),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'LigneAffectation',
    tableName: 'lignes_affectations',
  }
);

export default LigneAffectation;
