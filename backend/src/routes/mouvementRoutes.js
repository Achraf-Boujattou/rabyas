import { Router } from 'express';
import {
  createMouvement,
  cancelMouvement,
  getMouvements,
} from '../controllers/inventoryController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect, authorize('admin', 'magasinier'));
router.route('/').get(getMouvements).post(createMouvement);
router.post('/:id/annulation', cancelMouvement);

export default router;
