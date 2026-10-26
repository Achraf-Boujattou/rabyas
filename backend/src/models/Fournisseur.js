import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class Fournisseur extends Model {}

Fournisseur.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nom: {
      type: DataTypes.STRING(160),
      allowNull: false,
      validate: { notEmpty: { msg: 'Le nom du fournisseur est obligatoire' } },
    },
    contact: {
      type: DataTypes.STRING(160),
      allowNull: false,
      defaultValue: '',
    },
    telephone: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: '',
    },
    email: {
      type: DataTypes.STRING(191),
      allowNull: false,
      defaultValue: '',
      validate: {
        isEmailOrEmpty(value) {
          if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            throw new Error('Adresse e-mail fournisseur invalide');
          }
        },
      },
    },
    adresse: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
  },
  {
    sequelize,
    modelName: 'Fournisseur',
    tableName: 'fournisseurs_catalogue',
    hooks: {
      beforeValidate: (supplier) => {
        for (const field of ['nom', 'contact', 'telephone', 'email', 'adresse']) {
          if (typeof supplier[field] === 'string') supplier[field] = supplier[field].trim();
        }
        if (supplier.email) supplier.email = supplier.email.toLowerCase();
      },
    },
  }
);

export default Fournisseur;
