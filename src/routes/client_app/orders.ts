import { Router } from 'express';
import { createOrder, getMyOrders, getMyOrderDetails, previewPricing } from '../../controllers/client_app/orderController';
import { protect } from '../../middleware/auth';

const router = Router();

// Public routes for calculation (optional login)
router.post('/calculate', previewPricing);

// Protected routes for actual ordering and history
router.post('/', protect, createOrder);
router.get('/', protect, getMyOrders);
router.get('/:id', protect, getMyOrderDetails);

export default router;
