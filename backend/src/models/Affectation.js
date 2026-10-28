import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export const ASSIGNMENT_BENEFICIARY_TYPES = ['technicien', 'client', 'site'];
export const ASSIGNMENT_STATUSES = ['en_cours', 'retournee'];

export class Affectation extends Model {}

Affectation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    beneficiaireType: {
      type: DataTypes.ENUM(...ASSIGNMENT_BENEFICIARY_TYPES),
      allowNull: false,
      validate: {
        isIn: { args: [ASSIGNMENT_BENEFICIARY_TYPES], msg: 'Type de bénéficiaire invalide' },
      },
    },
    beneficiaireReference: {
      type: DataTypes.STRING(191),
      allowNull: false,
      validate: { notEmpty: { msg: 'Le bénéficiaire est obligatoire' } },
    },
    beneficiaireUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    statut: {
      type: DataTypes.ENUM(...ASSIGNMENT_STATUSES),
      allowNull: false,
      defaultValue: 'en_cours',
    },
    dateAttribution: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    dateRetour: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    utilisateurId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Affectation',
    tableName: 'affectations',
    indexes: [
      { fields: ['beneficiaire_type', 'beneficiaire_reference'] },
      { fields: ['statut', 'date_attribution'] },
    ],
  }
);

export default Affectation;
