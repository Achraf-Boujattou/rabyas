import { Router } from 'express';
import {
  createEquipement,
  deleteEquipement,
  getEquipementById,
  getEquipements,
  updateEquipement,
} from '../controllers/inventoryController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect, authorize('admin', 'magasinier'));
router.route('/').get(getEquipements).post(createEquipement);
router.route('/:id').get(getEquipementById).put(updateEquipement).delete(deleteEquipement);

export default router;
