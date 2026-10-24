import { DataTypes, Model } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '../config/database.js';

export class User extends Model {
  // Vérifie si le mot de passe fourni correspond au mot de passe hashé
  async comparePassword(candidatePassword) {
    if (!this.mot_de_passe || !candidatePassword) {
      return false;
    }
    return bcrypt.compare(candidatePassword, this.mot_de_passe);
  }

  // Évite d'exposer le mot de passe hashé dans les réponses JSON
  toJSON() {
    const values = { ...this.get() };
    delete values.mot_de_passe;
    return values;
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nom: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Le nom est obligatoire' },
      },
    },
    email: {
      type: DataTypes.STRING(191),
      allowNull: false,
      unique: {
        name: 'unique_user_email',
        msg: 'Cet email est déjà utilisé',
      },
      validate: {
        isEmail: { msg: "Format d'adresse email invalide" },
        notEmpty: { msg: "L'adresse email est obligatoire" },
      },
    },
    mot_de_passe: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Le mot de passe est obligatoire' },
      },
    },
    role: {
      type: DataTypes.ENUM('admin', 'magasinier', 'technicien'),
      allowNull: false,
      defaultValue: 'technicien',
      validate: {
        isIn: {
          args: [['admin', 'magasinier', 'technicien']],
          msg: "Le rôle doit être 'admin', 'magasinier' ou 'technicien'",
        },
      },
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    hooks: {
      beforeCreate: async (user) => {
        if (user.mot_de_passe) {
          const salt = await bcrypt.genSalt(10);
          user.mot_de_passe = await bcrypt.hash(user.mot_de_passe, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('mot_de_passe')) {
          const salt = await bcrypt.genSalt(10);
          user.mot_de_passe = await bcrypt.hash(user.mot_de_passe, salt);
        }
      },
    },
  }
);

export default User;
