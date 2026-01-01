import { Router } from 'express';
import { getProducts, getProductDetails, getCategories } from '../../controllers/client_app/catalogController';

const router = Router();

router.get('/products', getProducts);
router.get('/products/:id', getProductDetails);
router.get('/categories', getCategories);

export default router;
