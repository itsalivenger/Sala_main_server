import { Router } from 'express';
import { createOrder, getMyOrders, getMyOrderDetails, previewPricing, cancelOrder, getOrderMapData, confirmOrder } from '../../controllers/client_app/orderController';
import { downloadReceipt } from '../../controllers/client_app/receiptController';
import { protect } from '../../middleware/auth';

const router = Router();

// Public routes for calculation (optional login)
router.post('/calculate', previewPricing);

// Protected routes for actual ordering and history
router.post('/', protect, createOrder);
router.get('/', protect, getMyOrders);
router.get('/:id/map', protect, getOrderMapData);
router.get('/:id/receipt', protect, downloadReceipt);
// Message routes moved to separate file 'messages.ts' to avoid controller conflicts
// router.get('/:id/messages', protect, getOrderMessages);
// router.post('/:id/messages', protect, sendOrderMessage);
router.get('/:id', protect, getMyOrderDetails);
router.post('/:id/cancel', protect, cancelOrder);
router.post('/:id/confirm', protect, confirmOrder);

export default router;
