import { Router } from 'express';
import { getOrders, getOrderDetails, updateOrderStatus, addOrderNote } from '../../controllers/admin/ordersController';
import { protect } from '../../middleware/auth';
import { seedOrders } from '../../controllers/admin/seedController';

const router = Router();

router.get('/', protect, getOrders);
router.get('/:id', protect, getOrderDetails);
router.patch('/:id/status', protect, updateOrderStatus);
router.post('/:id/note', protect, addOrderNote);
router.post('/seed', protect, seedOrders);

export default router;
