import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export const PURCHASE_ORDER_STATUSES = [
  'brouillon',
  'envoyee',
  'reçue_partiellement',
  'reçue',
];

export class CommandeFournisseur extends Model {}

CommandeFournisseur.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    fournisseurId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    statut: {
      type: DataTypes.ENUM(...PURCHASE_ORDER_STATUSES),
      allowNull: false,
      defaultValue: 'brouillon',
      validate: {
        isIn: {
          args: [PURCHASE_ORDER_STATUSES],
          msg: 'Statut de commande invalide',
        },
      },
    },
    dateCommande: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    dateEnvoi: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    dateReception: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    commentaire: {
      type: DataTypes.STRING(500),
      allowNull: false,
      defaultValue: '',
    },
  },
  {
    sequelize,
    modelName: 'CommandeFournisseur',
    tableName: 'commandes_fournisseurs',
    hooks: {
      beforeValidate: (order) => {
        if (typeof order.commentaire === 'string') order.commentaire = order.commentaire.trim();
      },
    },
  }
);

export default CommandeFournisseur;
