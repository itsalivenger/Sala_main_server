import express from 'express';
import { sendMessage, getMessages } from '../../controllers/client_app/messageController';
import { protect } from '../../middleware/auth';

const router = express.Router();

// All routes are protected
router.use(protect);

// Message routes for specific order
router.route('/:orderId/messages')
    .get(getMessages)
    .post(sendMessage);

export default router;
