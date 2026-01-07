import { Router } from 'express';
import * as catalogController from '../../controllers/admin/catalogController';
import { protect as adminAuth } from '../../middleware/auth';

const router = Router();

// All routes are protected by adminAuth
router.use(adminAuth);

router.get('/products', catalogController.getCatalogProducts);
router.post('/products', catalogController.createProduct);
router.put('/products/:id', catalogController.updateProduct);
router.delete('/products/:id', catalogController.deleteProduct);
router.get('/products/:id', catalogController.getProductById);
router.get('/categories', catalogController.getCategories);

export default router;
