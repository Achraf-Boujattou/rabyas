import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Middleware vérifiant la validité du token JWT et l'état actif du compte utilisateur
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        message: 'Accès non autorisé : aucun token fourni',
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[AuthMiddleware] ERREUR CRITIQUE : JWT_SECRET non configuré');
      return res.status(500).json({
        message: 'Erreur de configuration serveur',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          message: 'Session expirée, veuillez vous reconnecter',
        });
      }
      return res.status(401).json({
        message: 'Token invalide ou corrompu',
      });
    }

    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({
        message: 'Utilisateur introuvable ou session révoquée',
      });
    }

    if (!user.actif) {
      return res.status(403).json({
        message: 'Votre compte est désactivé. Veuillez contacter un administrateur.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[AuthMiddleware] Erreur protect :', error);
    return res.status(500).json({
      message: 'Erreur interne lors de la vérification des droits',
    });
  }
};

/**
 * Middleware autorisant l'accès uniquement aux rôles spécifiés
 * @param  {...string} roles - Ex: 'admin', 'magasinier', 'technicien'
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Utilisateur non authentifié',
      });
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Accès refusé : rôle '${req.user.role}' non autorisé pour cette opération`,
      });
    }

    next();
  };
};

export default {
  protect,
  authorize,
};
