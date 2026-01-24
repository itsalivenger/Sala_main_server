import { Router } from 'express';
import * as notificationController from '../../controllers/client_app/notificationController';
import { protect } from '../../middleware/auth';

const router = Router();

// All routes are protected
router.use(protect);

router.get('/', notificationController.getNotifications);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);

export default router;
