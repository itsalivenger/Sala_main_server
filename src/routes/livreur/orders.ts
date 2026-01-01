import { Router } from 'express';
import {
    getAvailableOrders,
    getOrderDetails,
    acceptOrder,
    rejectOrder,
    getMyOrders
} from '../../controllers/livreur/ordersController';
import {
    markOrderPickedUp,
    markOrderInTransit,
    deliverOrder,
    cancelOrder
} from '../../controllers/livreur/orderLifecycleController';
import { protect } from '../../middleware/auth';

const router = Router();

// All routes require authentication
router.use(protect);

// Get available orders (not yet assigned)
router.get('/available', getAvailableOrders);

// Get my assigned orders
router.get('/my-orders', getMyOrders);

// Get order details
router.get('/:id', getOrderDetails);

// Accept an order
router.post('/:id/accept', acceptOrder);

// Reject an order
router.post('/:id/reject', rejectOrder);

// Order Lifecycle routes
router.patch('/:id/pickup', markOrderPickedUp);
router.patch('/:id/in-transit', markOrderInTransit);
router.post('/:id/deliver', deliverOrder);
router.post('/:id/cancel', cancelOrder);

export default router;
