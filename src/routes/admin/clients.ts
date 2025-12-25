import { Router } from 'express';
import { getAllClients, getClientProfile, updateClientStatus } from '../../controllers/admin/clientsController';
import { protect, authorize } from '../../middleware/auth';

const router = Router();

// All routes are protected and restricted to Admin roles
router.use(protect);
router.use(authorize('Super Admin', 'Manager', 'Support'));

router.route('/')
    .get(getAllClients);

router.route('/:id')
    .get(getClientProfile);

router.route('/:id/status')
    .put(updateClientStatus);

export default router;
