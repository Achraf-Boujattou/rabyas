import { Router } from 'express';
import {
  createMouvement,
  getMouvements,
} from '../controllers/inventoryController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect, authorize('admin', 'magasinier'));
router.route('/').get(getMouvements).post(createMouvement);

export default router;
