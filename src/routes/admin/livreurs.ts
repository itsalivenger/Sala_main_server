import { Router } from 'express';
import {
    getAllLivreurs,
    getLivreurProfile,
    updateLivreurKYC,
    adjustLivreurWallet,

    getLivreurActivity,
    deleteLivreur
} from '../../controllers/admin/livreursController';
import { protect, authorize } from '../../middleware/auth';

const router = Router();

// All routes are protected and restricted to Admin roles
router.use(protect);
router.use(authorize('Super Admin', 'Manager', 'Support'));

router.route('/')
    .get(getAllLivreurs);

router.route('/:id')
    .get(getLivreurProfile)
    .delete(deleteLivreur);

router.route('/:id/kyc')
    .put(updateLivreurKYC);

router.route('/:id/wallet/adjust')
    .post(adjustLivreurWallet);

router.route('/:id/activity')
    .get(getLivreurActivity);

export default router;
