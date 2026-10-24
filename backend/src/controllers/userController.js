import { Op } from 'sequelize';
import User from '../models/User.js';

/**
 * @desc    Obtenir la liste de tous les utilisateurs (avec recherche et filtres)
 * @route   GET /api/users
 * @access  Privé (Admin uniquement)
 */
export const getAllUsers = async (req, res) => {
  try {
    const { search, role, actif } = req.query;

    const whereClause = {};

    // Filtre par recherche texte (nom ou email)
    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      whereClause[Op.or] = [
        { nom: { [Op.like]: term } },
        { email: { [Op.like]: term } },
      ];
    }

    // Règle : l'administrateur est unique et ne figure pas dans la liste des collaborateurs à gérer
    if (role && ['magasinier', 'technicien'].includes(role)) {
      whereClause.role = role;
    } else {
      whereClause.role = { [Op.ne]: 'admin' };
    }

    // Filtre par statut actif / inactif
    if (actif !== undefined && actif !== '') {
      whereClause.actif = actif === 'true' || actif === true || actif === '1';
    }

    const users = await User.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      attributes: { exclude: ['mot_de_passe'] },
    });

    // Compteurs pour les collaborateurs (hors admin)
    const totalCollaborateurs = await User.count({ where: { role: { [Op.ne]: 'admin' } } });
    const activeCount = await User.count({ where: { role: { [Op.ne]: 'admin' }, actif: true } });
    const magasinierCount = await User.count({ where: { role: 'magasinier' } });
    const technicienCount = await User.count({ where: { role: 'technicien' } });

    return res.status(200).json({
      success: true,
      count: users.length,
      stats: {
        total: totalCollaborateurs,
        actifs: activeCount,
        inactifs: totalCollaborateurs - activeCount,
        magasiniers: magasinierCount,
        techniciens: technicienCount,
      },
      users,
    });
  } catch (error) {
    console.error('[UserController] Erreur getAllUsers :', error);
    return res.status(500).json({
      message: 'Erreur lors de la récupération des utilisateurs',
    });
  }
};

/**
 * @desc    Obtenir un utilisateur par son identifiant
 * @route   GET /api/users/:id
 * @access  Privé (Admin uniquement)
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: { exclude: ['mot_de_passe'] },
    });

    if (!user) {
      return res.status(404).json({
        message: 'Utilisateur introuvable',
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('[UserController] Erreur getUserById :', error);
    return res.status(500).json({
      message: 'Erreur lors de la récupération de l\'utilisateur',
    });
  }
};

/**
 * @desc    Créer un nouvel utilisateur (par l'administrateur)
 * @route   POST /api/users
 * @access  Privé (Admin uniquement)
 */
export const createUser = async (req, res) => {
  try {
    const { nom, email, mot_de_passe, password, role, actif } = req.body;
    const submittedPassword = mot_de_passe || password;

    // Validation des champs obligatoires
    if (!nom || !email || !submittedPassword) {
      return res.status(400).json({
        message: 'Veuillez renseigner le nom, l\'adresse email et le mot de passe initial',
      });
    }

    if (submittedPassword.length < 6) {
      return res.status(400).json({
        message: 'Le mot de passe doit contenir au moins 6 caractères',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Vérifier l'unicité de l'email
    const existingUser = await User.findOne({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(400).json({
        message: 'Un utilisateur avec cette adresse email existe déjà',
      });
    }

    // Règle stricte : Un seul compte administrateur autorisé dans le système
    const targetRole = role || 'technicien';
    if (targetRole === 'admin') {
      const existingAdmin = await User.findOne({ where: { role: 'admin' } });
      if (existingAdmin) {
        return res.status(400).json({
          message: "Le système n'autorise qu'un seul compte administrateur unique.",
        });
      }
    }

    // Création de l'utilisateur (le hook beforeCreate hashera le mot de passe avec bcrypt)
    const newUser = await User.create({
      nom: nom.trim(),
      email: cleanEmail,
      mot_de_passe: submittedPassword,
      role: targetRole,
      actif: actif !== undefined ? Boolean(actif) : true,
    });

    return res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      user: newUser.toJSON(),
    });
  } catch (error) {
    console.error('[UserController] Erreur createUser :', error);

    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }

    return res.status(500).json({
      message: 'Erreur lors de la création de l\'utilisateur',
    });
  }
};

/**
 * @desc    Modifier un utilisateur existant
 * @route   PUT /api/users/:id
 * @access  Privé (Admin uniquement)
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, email, role, actif } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        message: 'Utilisateur introuvable',
      });
    }

    // Si l'email est modifié, s'assurer qu'il n'est pas déjà pris
    if (email && email.trim().toLowerCase() !== user.email) {
      const cleanEmail = email.trim().toLowerCase();
      const duplicate = await User.findOne({
        where: {
          email: cleanEmail,
          id: { [Op.ne]: id },
        },
      });

      if (duplicate) {
        return res.status(400).json({
          message: 'Cette adresse email est déjà attribuée à un autre utilisateur',
        });
      }
      user.email = cleanEmail;
    }

    if (nom) user.nom = nom.trim();
    if (role && ['admin', 'magasinier', 'technicien'].includes(role)) {
      // Sécurité : l'administrateur unique ne peut pas être rétrogradé
      if (user.role === 'admin' && role !== 'admin') {
        return res.status(400).json({
          message: "L'administrateur unique ne peut pas être rétrogradé.",
        });
      }

      // Règle stricte : impossible de promouvoir un autre utilisateur en admin si un admin existe
      if (user.role !== 'admin' && role === 'admin') {
        const existingAdmin = await User.findOne({ where: { role: 'admin' } });
        if (existingAdmin && existingAdmin.id !== user.id) {
          return res.status(400).json({
            message: "Le rôle Administrateur est unique et ne peut pas être attribué à un autre compte.",
          });
        }
      }

      user.role = role;
    }

    if (actif !== undefined) {
      // Sécurité : empêcher l'admin de désactiver son propre compte
      if (req.user.id === user.id && !actif) {
        return res.status(400).json({
          message: 'Vous ne pouvez pas désactiver votre propre compte administrateur',
        });
      }
      user.actif = Boolean(actif);
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Utilisateur mis à jour avec succès',
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('[UserController] Erreur updateUser :', error);

    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }

    return res.status(500).json({
      message: 'Erreur lors de la mise à jour de l\'utilisateur',
    });
  }
};

/**
 * @desc    Basculer le statut d'un utilisateur (Activation / Désactivation au lieu de suppression)
 * @route   PATCH /api/users/:id/toggle-status
 * @access  Privé (Admin uniquement)
 */
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        message: 'Utilisateur introuvable',
      });
    }

    // Sécurité : interdiction pour un admin de se désactiver lui-même
    if (req.user.id === user.id) {
      return res.status(400).json({
        message: 'Action interdite : vous ne pouvez pas désactiver votre propre compte',
      });
    }

    user.actif = !user.actif;
    await user.save();

    const actionText = user.actif ? 'activé' : 'désactivé';

    return res.status(200).json({
      success: true,
      message: `Compte utilisateur ${actionText} avec succès`,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('[UserController] Erreur toggleUserStatus :', error);
    return res.status(500).json({
      message: 'Erreur lors de la modification du statut du compte',
    });
  }
};

/**
 * @desc    Réinitialiser le mot de passe d'un utilisateur
 * @route   PATCH /api/users/:id/reset-password
 * @access  Privé (Admin uniquement)
 */
export const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { nouveau_mot_de_passe, password, newPassword } = req.body;
    const nextPassword = nouveau_mot_de_passe || password || newPassword;

    if (!nextPassword || nextPassword.length < 6) {
      return res.status(400).json({
        message: 'Le nouveau mot de passe doit comporter au moins 6 caractères',
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        message: 'Utilisateur introuvable',
      });
    }

    // Le hook beforeUpdate se déclenche automatiquement car mot_de_passe est changé
    user.mot_de_passe = nextPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Mot de passe réinitialisé avec succès pour ${user.nom}`,
    });
  } catch (error) {
    console.error('[UserController] Erreur resetUserPassword :', error);
    return res.status(500).json({
      message: 'Erreur lors de la réinitialisation du mot de passe',
    });
  }
};

/**
 * @desc    Suppression définitive d'un utilisateur
 * @route   DELETE /api/users/:id
 * @access  Privé (Admin uniquement)
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        message: 'Utilisateur introuvable',
      });
    }

    if (req.user.id === user.id) {
      return res.status(400).json({
        message: 'Vous ne pouvez pas supprimer votre propre compte administrateur',
      });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        message: 'Le compte administrateur principal ne peut pas être supprimé',
      });
    }

    const userName = user.nom;
    // Suppression physique définitive
    await user.destroy();

    return res.status(200).json({
      success: true,
      message: `Le compte de ${userName} a été supprimé définitivement`,
    });
  } catch (error) {
    console.error('[UserController] Erreur deleteUser :', error);
    return res.status(500).json({
      message: 'Erreur lors de la suppression du compte',
    });
  }
};

export default {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  resetUserPassword,
  deleteUser,
};
