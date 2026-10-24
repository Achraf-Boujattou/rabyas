import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const GENERIC_AUTH_ERROR = 'Identifiants incorrects';

/**
 * Génère un token JWT signé avec l'ID et le rôle de l'utilisateur
 */
const generateToken = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET manquant dans les variables d\'environnement');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    secret,
    { expiresIn }
  );
};

/**
 * @desc    Connexion de l'utilisateur
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
  try {
    const { email, mot_de_passe, password } = req.body;
    const submittedPassword = mot_de_passe || password;

    // Validation des champs requis
    if (!email || !submittedPassword) {
      return res.status(400).json({
        message: 'Veuillez fournir un email et un mot de passe',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Recherche de l'utilisateur par email
    const user = await User.findOne({ where: { email: cleanEmail } });

    // En cas d'email inconnu : message d'erreur générique identique
    if (!user) {
      return res.status(401).json({
        message: GENERIC_AUTH_ERROR,
      });
    }

    // Vérification du mot de passe
    const isPasswordValid = await user.comparePassword(submittedPassword);

    // En cas de mauvais mot de passe : message d'erreur identique pour éviter l'énumération
    if (!isPasswordValid) {
      return res.status(401).json({
        message: GENERIC_AUTH_ERROR,
      });
    }

    // Vérification si le compte est actif
    if (!user.actif) {
      return res.status(403).json({
        message: 'Ce compte est désactivé. Veuillez contacter un administrateur.',
      });
    }

    // Génération du token JWT
    const token = generateToken(user);

    return res.status(200).json({
      message: 'Connexion réussie',
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('[AuthController] Erreur lors de la connexion :', error);
    return res.status(500).json({
      message: 'Une erreur interne est survenue lors de la tentative de connexion',
    });
  }
};

/**
 * @desc    Récupérer les informations de l'utilisateur connecté
 * @route   GET /api/auth/me
 * @access  Privé (Token requis)
 */
export const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      user: req.user.toJSON(),
    });
  } catch (error) {
    console.error('[AuthController] Erreur getMe :', error);
    return res.status(500).json({
      message: 'Erreur lors de la récupération du profil utilisateur',
    });
  }
};

/**
 * @desc    Modifier les informations du compte connecté
 * @route   PATCH /api/auth/me
 * @access  Privé (Token requis)
 */
export const updateMe = async (req, res) => {
  try {
    const { nom, email, currentPassword, newPassword } = req.body;
    const user = req.user;

    if (nom === undefined && email === undefined && newPassword === undefined) {
      return res.status(400).json({
        message: 'Aucune information à mettre à jour',
      });
    }

    if (nom !== undefined) {
      if (typeof nom !== 'string' || !nom.trim()) {
        return res.status(400).json({ message: 'Le nom est obligatoire' });
      }
      user.nom = nom.trim();
    }

    if (email !== undefined) {
      if (typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({ message: 'L’adresse e-mail est obligatoire' });
      }
      user.email = email.trim().toLowerCase();
    }

    if (newPassword !== undefined) {
      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({
          message: 'Le nouveau mot de passe doit contenir au moins 6 caractères',
        });
      }

      if (typeof currentPassword !== 'string' || !currentPassword) {
        return res.status(400).json({
          message: 'Le mot de passe actuel est obligatoire pour le modifier',
        });
      }

      const currentPasswordMatches = await user.comparePassword(currentPassword);
      if (!currentPasswordMatches) {
        return res.status(400).json({
          message: 'Le mot de passe actuel est incorrect',
        });
      }

      user.mot_de_passe = newPassword;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profil mis à jour avec succès',
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('[AuthController] Erreur updateMe :', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        message: error.errors.map((item) => item.message).join(', '),
      });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        message: 'Cette adresse e-mail est déjà utilisée',
      });
    }

    return res.status(500).json({
      message: 'Erreur lors de la mise à jour du profil',
    });
  }
};

export default {
  login,
  getMe,
  updateMe,
};
