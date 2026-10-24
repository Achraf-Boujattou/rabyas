import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  resetUserPassword,
  deleteUser,
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = Router();

// Toutes les routes utilisateurs sont strictement réservées à l'administrateur
router.use(protect);
router.use(authorize('admin'));

// Liste et création
router.route('/')
  .get(getAllUsers)
  .post(createUser);

// Consultation, modification et désactivation
router.route('/:id')
  .get(getUserById)
  .put(updateUser)
  .delete(deleteUser);

// Actions spécifiques
router.patch('/:id/toggle-status', toggleUserStatus);
router.patch('/:id/reset-password', resetUserPassword);

export default router;
