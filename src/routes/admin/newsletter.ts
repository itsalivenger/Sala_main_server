import { Router } from 'express';
import { subscribe, getSubscribers, deleteSubscriber, sendNewsletter } from '../../controllers/admin/newsletter';

const router = Router();

// Public
router.post('/subscribe', subscribe);

// Admin
router.get('/', getSubscribers);
router.delete('/:id', deleteSubscriber);
router.post('/send', sendNewsletter);

export default router;
