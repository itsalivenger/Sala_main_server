import { Router } from 'express';
import { getOrders, getOrderDetails, updateOrderStatus, addOrderNote } from '../../controllers/admin/ordersController';
import { protect } from '../../middleware/auth';
import { seedOrders } from '../../controllers/admin/seedController';
import { seedProducts } from '../../controllers/admin/seedProductsController';

const router = Router();

router.get('/', protect, getOrders);
router.get('/:id', protect, getOrderDetails);
router.patch('/:id/status', protect, updateOrderStatus);
router.post('/:id/note', protect, addOrderNote);
router.post('/seed', protect, seedOrders);
router.post('/seed-products', protect, seedProducts);

export default router;
