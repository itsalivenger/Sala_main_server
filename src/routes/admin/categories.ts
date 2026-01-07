import { Router } from 'express';
import * as categoryController from '../../controllers/admin/categoryController';
import { protect } from '../../middleware/auth';

const router = Router();

// All category management routes are protected (Admin only)
router.use(protect);

router.get('/', categoryController.getCategories);
router.post('/', categoryController.createCategory);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

export default router;
