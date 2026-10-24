import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export const STOCK_MOVEMENT_TYPES = ['entree', 'sortie', 'retour'];

export class MouvementStock extends Model {}

MouvementStock.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    articleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    equipementId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM(...STOCK_MOVEMENT_TYPES),
      allowNull: false,
      validate: {
        isIn: {
          args: [STOCK_MOVEMENT_TYPES],
          msg: 'Type de mouvement invalide',
        },
      },
    },
    quantite: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: false,
      validate: { min: 0.001 },
    },
    emplacement: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },
    commentaire: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: '',
    },
  },
  {
    sequelize,
    modelName: 'MouvementStock',
    tableName: 'mouvements_articles',
    updatedAt: false,
    hooks: {
      beforeValidate: (movement) => {
        for (const field of ['emplacement', 'commentaire']) {
          if (typeof movement[field] === 'string') movement[field] = movement[field].trim();
        }
      },
    },
  }
);

export default MouvementStock;
