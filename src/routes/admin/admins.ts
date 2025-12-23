import { Router } from 'express';
import { getAdmins, createAdmin, updateAdmin, deleteAdmin } from '../../controllers/admin/admins';

const router = Router();

router.get('/', getAdmins);
router.post('/', createAdmin);
router.put('/:id', updateAdmin);
router.delete('/:id', deleteAdmin);

export default router;
