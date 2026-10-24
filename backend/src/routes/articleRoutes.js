import { Router } from 'express';
import {
  createArticle,
  deleteArticle,
  getArticleById,
  getArticleStock,
  getArticles,
  getLowStockArticles,
  updateArticle,
} from '../controllers/inventoryController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect, authorize('admin', 'magasinier'));
router.get('/stock/low-stock', getLowStockArticles);
router.get('/stock', getArticleStock);
router.route('/').get(getArticles).post(createArticle);
router.route('/:id').get(getArticleById).put(updateArticle).delete(deleteArticle);

export default router;
