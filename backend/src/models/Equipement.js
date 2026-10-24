import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export const EQUIPMENT_STATES = [
  'neuf',
  'en_service',
  'en_panne',
  'repare',
  'reforme',
];

export class Equipement extends Model {}

Equipement.init(
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
    numeroSerie: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: { name: 'unique_equipment_serial', msg: 'Ce numéro de série existe déjà' },
      validate: { notEmpty: { msg: 'Le numéro de série est obligatoire' } },
    },
    etat: {
      type: DataTypes.ENUM(...EQUIPMENT_STATES),
      allowNull: false,
      defaultValue: 'neuf',
      validate: {
        isIn: {
          args: [EQUIPMENT_STATES],
          msg: 'État d’équipement invalide',
        },
      },
    },
    emplacement: {
      type: DataTypes.STRING(160),
      allowNull: false,
      validate: { notEmpty: { msg: 'L’emplacement ou dépôt est obligatoire' } },
    },
  },
  {
    sequelize,
    modelName: 'Equipement',
    tableName: 'equipements_serialises',
    paranoid: true,
    hooks: {
      beforeValidate: (equipment) => {
        for (const field of ['numeroSerie', 'emplacement']) {
          if (typeof equipment[field] === 'string') equipment[field] = equipment[field].trim();
        }
      },
    },
  }
);

export default Equipement;
