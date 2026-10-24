import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export const ARTICLE_CATEGORIES = [
  'routeur',
  'switch',
  'modem',
  'ont',
  'cable',
  'antenne',
  'carte_sim',
  'autre',
];

export class Article extends Model {}

Article.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    reference: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: { name: 'unique_article_reference', msg: 'Cette référence existe déjà' },
      validate: { notEmpty: { msg: 'La référence est obligatoire' } },
    },
    designation: {
      type: DataTypes.STRING(160),
      allowNull: false,
      validate: { notEmpty: { msg: 'La désignation est obligatoire' } },
    },
    categorie: {
      type: DataTypes.ENUM(...ARTICLE_CATEGORIES),
      allowNull: false,
      validate: {
        isIn: { args: [ARTICLE_CATEGORIES], msg: 'Catégorie invalide' },
      },
    },
    marque: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: '',
    },
    unite: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'unité',
      validate: { notEmpty: { msg: 'L’unité est obligatoire' } },
    },
    seuilMinimum: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    suiviParNumeroSerie: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'Article',
    tableName: 'catalogue_articles',
    hooks: {
      beforeValidate: (article) => {
        for (const field of ['reference', 'designation', 'categorie', 'marque', 'unite']) {
          if (typeof article[field] === 'string') article[field] = article[field].trim();
        }
      },
    },
  }
);

export default Article;
