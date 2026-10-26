import { Router } from 'express';
import {
  createCommande,
  createFournisseur,
  deleteCommande,
  deleteFournisseur,
  getCommande,
  getCommandes,
  getFournisseur,
  getFournisseurs,
  receiveCommande,
  updateCommande,
  updateFournisseur,
} from '../controllers/supplierController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect, authorize('admin', 'magasinier'));

router.route('/')
  .get(getFournisseurs)
  .post(createFournisseur);
router.route('/commandes')
  .get(getCommandes)
  .post(createCommande);
router.route('/commandes/:id')
  .get(getCommande)
  .put(updateCommande)
  .delete(deleteCommande);
router.post('/commandes/:id/reception', receiveCommande);
router.route('/:id')
  .get(getFournisseur)
  .put(updateFournisseur)
  .delete(deleteFournisseur);

export default router;
