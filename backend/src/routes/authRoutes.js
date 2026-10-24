import { Router } from 'express';
import { login, getMe, updateMe } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// Route de connexion publique
router.post('/login', login);

// Route d'information sur l'utilisateur connecté (protégée)
router.get('/me', protect, getMe);
router.patch('/me', protect, updateMe);

export default router;
