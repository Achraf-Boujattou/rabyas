import { Router } from 'express';
import {
  createAffectation,
  getAffectationById,
  getAffectations,
  getTechnicianOptions,
  returnAffectation,
} from '../controllers/assignmentController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect);
router.get('/techniciens', authorize('admin', 'magasinier'), getTechnicianOptions);
router.get('/', authorize('admin', 'magasinier', 'technicien'), getAffectations);
router.get('/:id', authorize('admin', 'magasinier', 'technicien'), getAffectationById);
router.post('/', authorize('admin', 'magasinier'), createAffectation);
router.post('/:id/retour', authorize('admin', 'magasinier'), returnAffectation);

export default router;
