import { Router } from 'express';
import {
    getAvailableOrders,
    getOrderDetails,
    acceptOrder,
    rejectOrder,
    getMyOrders,
    getOrderTracking,
    getOrderMessages,
    sendOrderMessage
} from '../../controllers/livreur/ordersController';
import {
    markOrderPickedUp,
    markOrderInTransit,
    deliverOrder,
    cancelOrder,
    markOrderShopping
} from '../../controllers/livreur/orderLifecycleController';
import { protect } from '../../middleware/auth';

const router = Router();

// All routes require authentication
router.use(protect);

// DIAGNOSTIC: Log all requests to this router
router.use((req, res, next) => {
    console.log(`[ORDERS_ROUTER] ${req.method} ${req.url} (base: ${req.baseUrl})`);
    next();
});

// ========================================
// STATIC ROUTES FIRST (no parameters)
// ========================================
router.get('/ping-orders', (req, res) => res.json({ success: true, message: 'Livreur orders router is active' }));
router.get('/available', getAvailableOrders);
router.get('/my-orders', getMyOrders);

// ========================================
// PARAMETERIZED ROUTES (with :id)
// ========================================
// Chat and Tracking
router.get('/:id/messages', getOrderMessages);
router.post('/:id/messages', sendOrderMessage);
router.get('/:id/tracking', getOrderTracking);

// Order actions
router.post('/:id/accept', acceptOrder);
router.post('/:id/reject', rejectOrder);

// Order Lifecycle routes
router.patch('/:id/shopping', markOrderShopping);
router.patch('/:id/pickup', markOrderPickedUp);
router.patch('/:id/in-transit', markOrderInTransit);
router.post('/:id/deliver', deliverOrder);
router.post('/:id/cancel', cancelOrder);

// Get order details (most generic :id route, must be LAST)
router.get('/:id', getOrderDetails);

export default router;
