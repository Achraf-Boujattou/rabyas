import { Router } from 'express';
import { getDashboard } from '../controllers/dashboardController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', protect, authorize('admin', 'magasinier', 'technicien'), getDashboard);

export default router;
