import { Router } from 'express';
import { subscribe, getSubscribers, deleteSubscriber, sendNewsletter } from '../../controllers/admin/newsletter';
import { protect } from '../../middleware/auth';

const router = Router();

// Public
router.post('/subscribe', subscribe);

// Admin (Protected)
router.get('/', protect, getSubscribers);
router.delete('/:id', protect, deleteSubscriber);
router.post('/send', protect, sendNewsletter);

export default router;
