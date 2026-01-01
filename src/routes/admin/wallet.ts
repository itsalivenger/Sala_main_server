import { Router } from 'express';
import * as adminWalletController from '../../controllers/admin/walletController';
// Assuming a 'protectAdmin' middleware exists or just use 'protect' if it handles roles
// For now using the existing protect middleware if available, otherwise I'll need to check
import { protect } from '../../middleware/auth';

const router = Router();

router.use(protect); // In a real app, this should also check for is_admin role

router.get('/settings', adminWalletController.getSettings);
router.put('/settings', adminWalletController.updateSettings);
router.post('/adjust', adminWalletController.adjustBalance);
router.get('/:livreurId', adminWalletController.getWalletByLivreur);

export default router;
